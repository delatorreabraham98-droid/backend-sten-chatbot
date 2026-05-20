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
// ARCHIVO BASE DE DATOS LOCAL
// =====================================

const DB_PATH = path.resolve(
  "./vehicleBulbs.json"
);

// =====================================
// CARGAR BASE LOCAL
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
// GUARDAR BASE LOCAL
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
    message.trim();

  // =====================================
  // FORMATO:
  // Camaro 2010
  // Civic 2018
  // Silverado 2015
  // =====================================

  const regex1 =
    /\b([A-Za-z]+)\s+((19|20)\d{2})\b/i;

  // =====================================
  // FORMATO:
  // 2010 Camaro
  // 2018 Civic
  // =====================================

  const regex2 =
    /\b((19|20)\d{2})\s+([A-Za-z]+)\b/i;

  // =====================================
  // FORMATO:
  // Ford Focus 2002
  // Chevrolet Camaro 2010
  // =====================================

  const regex3 =
    /\b([A-Za-z]+)\s+([A-Za-z0-9]+)\s+((19|20)\d{2})\b/i;

  let match =
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
// DETERMINAR SI ES DUAL
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

    const text = $("body").text();

    const matches = text.match(
      /\b(H13|H11|H9|H7|H4|9004|9005|9006|9007|H1|H3|H16)\b/g
    );

    if (!matches?.length) {
      return null;
    }

    const bulb = matches[0];

    return {
      bulb,
      sameBulb:
        isDualBeamBulb(bulb),
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

async function scrapeAutoZone(vehicle) {

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

    const text = $("body").text();

    const matches = text.match(
      /\b(H13|H11|H9|H7|H4|9004|9005|9006|9007|H1|H3|H16)\b/g
    );

    if (!matches?.length) {
      return null;
    }

    const bulb = matches[0];

    return {
      bulb,
      sameBulb:
        isDualBeamBulb(bulb),
      source: "autozone"
    };

  } catch {

    return null;

  }
}

// =====================================
// SCRAPING ROCKAUTO
// =====================================

async function scrapeRockAuto(vehicle) {

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

    const text = $("body").text();

    const matches = text.match(
      /\b(H13|H11|H9|H7|H4|9004|9005|9006|9007|H1|H3|H16)\b/g
    );

    if (!matches?.length) {
      return null;
    }

    const bulb = matches[0];

    return {
      bulb,
      sameBulb:
        isDualBeamBulb(bulb),
      source: "rockauto"
    };

  } catch {

    return null;

  }
}

// =====================================
// OBTENER DATOS VEHICULO
// =====================================

async function getVehicleInfo(vehicle) {

  const db =
    await loadVehicleDatabase();

  // =====================================
  // 1. BUSCAR LOCAL
  // =====================================

  if (db[vehicle]) {

    console.log(
      "Vehículo encontrado localmente"
    );

    return {
      ...db[vehicle],
      fromCache: true
    };
  }

  console.log(
    "Buscando vehículo online..."
  );

  // =====================================
  // 2. SCRAPING
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

      if (result?.bulb) {

        // =====================================
        // 3. GUARDAR LOCALMENTE
        // =====================================

        db[vehicle] = result;

        await saveVehicleDatabase(db);

        console.log(
          "Vehículo guardado localmente"
        );

        return result;
      }

    } catch (error) {

      console.log(
        "Scraping error:",
        error.message
      );

    }

  }

  return null;
}

// =====================================
// GENERAR PRECIOS
// =====================================

function generatePrices(
  sameBulb
) {

  if (sameBulb) {

    return {
      cob2: 250,
      cob4: 350,
      csp: 450
    };
  }

  return {
    cob2: 200,
    cob4: 300,
    csp: 400
  };
}

// =====================================
// RESPUESTA DIRECTA
// =====================================

function buildVehicleReply({
  greeting,
  vehicle,
  bulb,
  sameBulb
}) {

  const prices =
    generatePrices(sameBulb);

  if (sameBulb) {

    return `
${greeting}

[${vehicle}]

🔦 Altas y bajas: ${bulb}

· COB 2 Caras $${prices.cob2} MXN
· COB 4 Caras $${prices.cob4} MXN
· CSP Premium $${prices.csp} MXN ⭐ (recomendado)

✅ 6 meses de garantía
🔧 Instalación: $100 MXN

📍 De La Torre LED Shop
📱 686 471 9077

🚗 Entregas:
Portales · Juventud 2000 · Costco
Soriana Anáhuac · Smart & Final
Plaza Mandarin

🚘 Domicilio:
$100 MXN adicionales
`.trim();
  }

  return `
${greeting}

[${vehicle}]

🔦 Altas: ${bulb}
🔦 Bajas: ${bulb}

· COB 2 Caras $${prices.cob2} MXN
· COB 4 Caras $${prices.cob4} MXN
· CSP Premium $${prices.csp} MXN ⭐ (recomendado)

✅ 6 meses de garantía
🔧 Instalación: $100 MXN

📍 De La Torre LED Shop
📱 686 471 9077

🚗 Entregas:
Portales · Juventud 2000 · Costco
Soriana Anáhuac · Smart & Final
Plaza Mandarin

🚘 Domicilio:
$100 MXN adicionales
`.trim();
}

// =====================================
// FUNCION PRINCIPAL
// =====================================

export async function generateBotReply({
  customerMessage,
  customerName,
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
      timeZone: "America/Tijuana"
    }).format(now)
  );

  let greeting =
    "Buenas tardes";

  if (hour >= 5 && hour < 12) {
    greeting = "Buenos días";
  } else if (
    hour >= 20 ||
    hour < 5
  ) {
    greeting = "Buenas noches";
  }

  // =====================================
  // DETECTAR VEHICULO
  // =====================================

  const vehicle =
    detectVehicle(customerMessage);

  // =====================================
  // SI HAY VEHICULO
  // =====================================

  if (vehicle) {

    const vehicleInfo =
      await getVehicleInfo(vehicle);

    if (vehicleInfo) {

      return buildVehicleReply({
        greeting,
        vehicle:
          vehicle
            .split(" ")
            .map(
              word =>
                word.charAt(0)
                  .toUpperCase() +
                word.slice(1)
            )
            .join(" "),
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
  // OPENAI SOLO PARA CHAT
  // =====================================

  const completion =
    await openai.chat.completions.create({

      model: config.openai.model,

      temperature: 0.3,

      max_tokens: 120,

      messages: [
        {
          role: "system",
          content: `
Eres el vendedor de De La Torre LED Shop.

SOLO vendes:
- luces LED delanteras para automóvil

NO menciones:
- tiras LED
- decoración
- paneles
- motos

Hablas como persona real de Mexicali.

Respuestas:
- cortas
- naturales
- WhatsApp real

Si el cliente menciona:
- H13
- H11
- H4
- 9005
- 9006
- foco
- LED
- luces delanteras

entiende que habla de focos LED automotrices.
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
          content: customerMessage
        }
      ]
    });

  return (
    completion.choices[0]
      ?.message?.content?.trim() ||
    `${greeting} 👋 ¿Cuál es el año y modelo de su vehículo?`
  );
}
