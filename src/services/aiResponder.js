import OpenAI from "openai";
import axios from "axios";
import fs from "fs/promises";
import path from "path";
import * as cheerio from "cheerio";

import { config } from "../config.js";

const openai = new OpenAI({
  apiKey: config.openai.apiKey
});

// =====================================
// BASE LOCAL
// =====================================

const DB_PATH = path.resolve(
  "./vehicleBulbs.json"
);

// =====================================
// CARGAR BASE
// =====================================

async function loadVehicleDatabase() {

  try {

    const file =
      await fs.readFile(DB_PATH, "utf8");

    return JSON.parse(file);

  } catch {

    return {};

  }
}

// =====================================
// GUARDAR BASE
// =====================================

async function saveVehicleDatabase(data) {

  await fs.writeFile(
    DB_PATH,
    JSON.stringify(data, null, 2),
    "utf8"
  );
}

// =====================================
// DETECTAR VEHICULO
// =====================================

function detectVehicle(message) {

  const cleanMessage =
    message
      .trim()
      .toLowerCase();

  const regex1 =
    /\b([a-z]+)\s+((19|20)\d{2})\b/i;

  const regex2 =
    /\b((19|20)\d{2})\s+([a-z]+)\b/i;

  const regex3 =
    /\b([a-z]+)\s+([a-z0-9]+)\s+((19|20)\d{2})\b/i;

  const regex4 =
    /\b(?:para|ocupo|busco|quiero|necesito)\s+(?:un\s+|una\s+)?([a-z]+(?:\s+[a-z0-9]+)?)\s+((19|20)\d{2})\b/i;

  let match =
    cleanMessage.match(regex4);

  if (match) {

    return `${match[1]} ${match[2]}`
      .trim()
      .toLowerCase();
  }

  match =
    cleanMessage.match(regex3);

  if (match) {

    return match[0]
      .trim()
      .toLowerCase();
  }

  match =
    cleanMessage.match(regex1);

  if (match) {

    return match[0]
      .trim()
      .toLowerCase();
  }

  match =
    cleanMessage.match(regex2);

  if (match) {

    return match[0]
      .trim()
      .toLowerCase();
  }

  return null;
}

// =====================================
// SALUDO
// =====================================

function shouldIncludeGreeting(message) {

  const text =
    message.toLowerCase();

  return (
    text.includes("hola") ||
    text.includes("buenas") ||
    text.includes("buenos días") ||
    text.includes("buenas tardes") ||
    text.includes("buenas noches")
  );
}

// =====================================
// DUAL BEAM
// =====================================

function isDualBeamBulb(bulb) {

  const dualBulbs = [
    "H13",
    "H4",
    "9004",
    "9007"
  ];

  return dualBulbs.includes(
    bulb?.toUpperCase()
  );
}

// =====================================
// EXTRAER FOCO
// =====================================

function extractBulb(text) {

  const matches = text.match(
    /\b(H13|H11|H9|H7|H4|9004|9005|9006|9007|H1|H3|H16)\b/g
  );

  if (!matches?.length) {
    return null;
  }

  return matches[0];
}

// =====================================
// SCRAPING SUPERBRIGHTLEDS
// =====================================

async function scrapeSuperBrightLEDs(
  vehicle
) {

  try {

    const url =
      `https://www.superbrightleds.com/vehicle-lights?find=${encodeURIComponent(vehicle)}`;

    const response =
      await axios.get(url, {
        headers: {
          "User-Agent":
            "Mozilla/5.0"
        },
        timeout: 10000
      });

    const $ = cheerio.load(
      response.data
    );

    const text =
      $("body").text();

    const bulb =
      extractBulb(text);

    if (!bulb) {
      return null;
    }

    const sameBulb =
      isDualBeamBulb(bulb);

    return {
      bulb: sameBulb
        ? bulb
        : {
            high: bulb,
            low:
              bulb === "9005"
                ? "9006"
                : bulb
          },

      sameBulb,

      source:
        "superbrightleds"
    };

  } catch {

    return null;

  }
}

// =====================================
// SCRAPING AUTOZONE
// =====================================

async function scrapeAutoZone(
  vehicle
) {

  try {

    const url =
      `https://www.autozone.com/searchresult?searchText=${encodeURIComponent(vehicle + " headlight bulb")}`;

    const response =
      await axios.get(url, {
        headers: {
          "User-Agent":
            "Mozilla/5.0"
        },
        timeout: 10000
      });

    const $ = cheerio.load(
      response.data
    );

    const text =
      $("body").text();

    const bulb =
      extractBulb(text);

    if (!bulb) {
      return null;
    }

    const sameBulb =
      isDualBeamBulb(bulb);

    return {
      bulb: sameBulb
        ? bulb
        : {
            high: bulb,
            low:
              bulb === "9005"
                ? "9006"
                : bulb
          },

      sameBulb,

      source:
        "autozone"
    };

  } catch {

    return null;

  }
}

// =====================================
// SCRAPING ROCKAUTO
// =====================================

async function scrapeRockAuto(
  vehicle
) {

  try {

    const url =
      `https://www.rockauto.com/en/catalog/?carcode=${encodeURIComponent(vehicle)}`;

    const response =
      await axios.get(url, {
        headers: {
          "User-Agent":
            "Mozilla/5.0"
        },
        timeout: 10000
      });

    const $ = cheerio.load(
      response.data
    );

    const text =
      $("body").text();

    const bulb =
      extractBulb(text);

    if (!bulb) {
      return null;
    }

    const sameBulb =
      isDualBeamBulb(bulb);

    return {
      bulb: sameBulb
        ? bulb
        : {
            high: bulb,
            low:
              bulb === "9005"
                ? "9006"
                : bulb
          },

      sameBulb,

      source:
        "rockauto"
    };

  } catch {

    return null;

  }
}

// =====================================
// OBTENER INFO VEHICULO
// =====================================

async function getVehicleInfo(
  vehicle
) {

  const db =
    await loadVehicleDatabase();

  // =====================================
  // CACHE
  // =====================================

  if (db[vehicle]) {

    console.log(
      "Vehículo encontrado localmente"
    );

    return db[vehicle];
  }

  console.log(
    "Buscando vehículo online..."
  );

  // =====================================
  // SCRAPERS
  // =====================================

  const scrapers = [
    scrapeSuperBrightLEDs,
    scrapeAutoZone,
    scrapeRockAuto
  ];

  for (const scraper of scrapers) {

    try {

      const result =
        await scraper(vehicle);

      if (result) {

        db[vehicle] = result;

        await saveVehicleDatabase(db);

        console.log(
          "Vehículo guardado localmente"
        );

        return result;
      }

    } catch (error) {

      console.log(
        error.message
      );

    }

  }

  return null;
}

// =====================================
// RESPUESTA FINAL
// =====================================

function buildVehicleReply({
  greeting,
  includeGreeting,
  vehicle,
  bulb,
  sameBulb
}) {

  const formattedVehicle =
    vehicle
      .split(" ")
      .map(word =>
        word.charAt(0)
          .toUpperCase() +
        word.slice(1)
      )
      .join(" ");

  const greetingText =
    includeGreeting
      ? `${greeting}\n`
      : "";

  // =====================================
  // MISMO FOCO
  // =====================================

  if (sameBulb) {

    return `
${greetingText}[${formattedVehicle}]

🔦Usa ${bulb} para altas y bajas

· COB 2 Caras $250 MXN 6,000 lúmenes ✅ 3 meses de garantía
· COB 4 Caras $350 MXN 12,000 lúmenes ✅ 3 meses de garantía
· CSP Premium $500 MXN 20,000 lúmenes ✅ 6 meses de garantía ⭐ (recomendado)

🔧 Instalación: $100 MXN

📍 De La Torre LED Shop
📱 686 471 9077

🚗 Entregas:
✅ Portales
✅ Juventud 2000
✅ Costco
✅ Soriana Anáhuac
✅ Smart & Final
✅ Plaza Mandarin

🚘 A domicilio:
$100 MXN adicionales
`.trim();
  }

  // =====================================
  // SEPARADOS
  // =====================================

  return `
${greetingText}[${formattedVehicle}]

🔦Usa ${bulb.high} para las altas

· COB 2 Caras $200 MXN 6,000 lúmenes ✅ 3 meses de garantía
· COB 4 Caras $300 MXN 12,000 lúmenes ✅ 3 meses de garantía
· CSP Premium $450 MXN 20,000 lúmenes ✅ 6 meses de garantía ⭐ (recomendado)

🔦Usa ${bulb.low} para las bajas

· COB 2 Caras $200 MXN 6,000 lúmenes ✅ 3 meses de garantía
· COB 4 Caras $300 MXN 12,000 lúmenes ✅ 3 meses de garantía
· CSP Premium $450 MXN 20,000 lúmenes ✅ 6 meses de garantía ⭐ (recomendado)

🔧 Instalación: $100 MXN

📍 De La Torre LED Shop
📱 686 471 9077

🚗 Entregas:
✅ Portales
✅ Juventud 2000
✅ Costco
✅ Soriana Anáhuac
✅ Smart & Final
✅ Plaza Mandarin

🚘 A domicilio:
$100 MXN adicionales
`.trim();
}

// =====================================
// FUNCION PRINCIPAL
// =====================================

export async function generateBotReply({
  customerMessage,
  conversationHistory = []
}) {

  // =====================================
  // SALUDO
  // =====================================

  const now = new Date();

  const hour = Number(
    new Intl.DateTimeFormat("es-MX", {
      hour: "numeric",
      hour12: false,
      timeZone:
        "America/Tijuana"
    }).format(now)
  );

  let greeting =
    "Buenas tardes";

  if (
    hour >= 5 &&
    hour < 12
  ) {

    greeting =
      "Buenos días";

  } else if (
    hour >= 20 ||
    hour < 5
  ) {

    greeting =
      "Buenas noches";
  }

  // =====================================
  // DETECTAR VEHICULO
  // =====================================

  const vehicle =
    detectVehicle(
      customerMessage
    );

  // =====================================
  // RESPUESTA AUTOMOTRIZ
  // =====================================

  if (vehicle) {

    const vehicleInfo =
      await getVehicleInfo(
        vehicle
      );

    if (vehicleInfo) {

      return buildVehicleReply({

        greeting,

        includeGreeting:
          shouldIncludeGreeting(
            customerMessage
          ),

        vehicle,

        bulb:
          vehicleInfo.bulb,

        sameBulb:
          vehicleInfo.sameBulb
      });
    }

    return `
${greeting}

Déjame verificar ese modelo,
ahorita te confirmo.
`.trim();
  }

  // =====================================
  // FALLBACK OPENAI
  // =====================================

  const completion =
    await openai.chat.completions.create({

      model:
        config.openai.model,

      temperature: 0.1,

      max_tokens: 120,

      messages: [
        {
          role: "system",
          content: `
Eres el vendedor de De La Torre LED Shop.

SOLO vendes:
- luces LED delanteras automotrices

NO menciones:
- tiras LED
- decoración
- paneles
- motos

Hablas como persona real
de Mexicali.

Mensajes:
- cortos
- naturales
- tipo WhatsApp
`
        },

        ...conversationHistory.flatMap(
          msg => {

            if (
              msg.direction ===
              "inbound"
            ) {

              return [{
                role: "user",
                content:
                  msg.message_text
              }];
            }

            if (
              msg.direction ===
                "outbound" &&
              msg.sender_type ===
                "bot"
            ) {

              return [{
                role: "assistant",
                content:
                  msg.message_text
              }];
            }

            return [];
          }
        ),

        {
          role: "user",
          content:
            customerMessage
        }
      ]
    });

  return (
    completion.choices[0]
      ?.message?.content?.trim() ||
    `${greeting} 👋 ¿Cuál es el año y modelo de su vehículo?`
  );
}
