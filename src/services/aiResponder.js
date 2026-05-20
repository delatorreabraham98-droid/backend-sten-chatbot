import OpenAI from "openai";
import fs from "fs/promises";
import path from "path";

import { config } from "../config.js";

const openai = new OpenAI({
  apiKey: config.openai.apiKey
});

// =====================================
// CACHE LOCAL
// =====================================

const DB_PATH = path.resolve(
  "./vehicleBulbs.json"
);

// =====================================
// MEMORIA CONVERSACIONAL
// =====================================

const conversationMemory =
  new Map();

// =====================================
// BASE OEM VERIFICADA
// =====================================

const knownVehicles = {

  "ford focus 2002": {
    bulb: "H4",
    sameBulb: true
  },

  "mitsubishi lancer 2003": {
    bulb: "9007",
    sameBulb: true
  },

  "chevrolet camaro 2010": {
    bulb: "H13",
    sameBulb: true
  },

  "honda civic 2010": {
    bulb: {
      high: "9005",
      low: "9006"
    },
    sameBulb: false
  }
};

// =====================================
// CARGAR DB
// =====================================

async function loadVehicleDatabase() {

  try {

    const file =
      await fs.readFile(
        DB_PATH,
        "utf8"
      );

    const parsed =
      JSON.parse(file);

    console.log(
      "DB cargada correctamente"
    );

    return parsed;

  } catch (error) {

    console.log(
      "Error leyendo DB:",
      error.message
    );

    return {};
  }
}

// =====================================
// GUARDAR DB
// =====================================

async function saveVehicleDatabase(
  data
) {

  try {

    console.log(
      "Guardando vehicleBulbs.json..."
    );

    await fs.writeFile(
      DB_PATH,
      JSON.stringify(
        data,
        null,
        2
      ),
      "utf8"
    );

    console.log(
      "DB guardada correctamente"
    );

    console.log(
      JSON.stringify(
        data,
        null,
        2
      )
    );

  } catch (error) {

    console.log(
      "Error guardando DB:",
      error.message
    );
  }
}

// =====================================
// NORMALIZAR VEHICULO
// =====================================

function normalizeVehicleName(
  vehicle
) {

  let normalized =
    vehicle.toLowerCase();

  if (
    normalized.includes("focus") &&
    !normalized.includes("ford")
  ) {

    normalized =
      `ford ${normalized}`;
  }

  if (
    normalized.includes("lancer") &&
    !normalized.includes("mitsubishi")
  ) {

    normalized =
      `mitsubishi ${normalized}`;
  }

  if (
    normalized.includes("camaro") &&
    !normalized.includes("chevrolet")
  ) {

    normalized =
      `chevrolet ${normalized}`;
  }

  if (
    normalized.includes("civic") &&
    !normalized.includes("honda")
  ) {

    normalized =
      `honda ${normalized}`;
  }

  return normalized;
}

// =====================================
// DETECTAR VEHICULO
// =====================================

function detectVehicle(message) {

  const clean =
    message.toLowerCase();

  const yearMatch =
    clean.match(
      /\b(19|20)\d{2}\b/
    );

  const year =
    yearMatch
      ? yearMatch[0]
      : null;

  const modelMatch =
    clean.match(
      /\b(camaro|focus|civic|lancer|silverado|sentra|corolla|accord|mustang|ram|altima|jetta|malibu|fusion|escape|sierra|tahoe|cruze)\b/i
    );

  const model =
    modelMatch
      ? modelMatch[0]
      : null;

  // =====================================
  // MODELO + AÑO
  // =====================================

  if (
    model &&
    year
  ) {

    return {
      complete: true,
      vehicle:
        `${model} ${year}`
    };
  }

  // =====================================
  // SOLO MODELO
  // =====================================

  if (
    model &&
    !year
  ) {

    return {
      complete: false,
      model
    };
  }

  // =====================================
  // SOLO AÑO
  // =====================================

  if (
    year &&
    !model
  ) {

    return {
      complete: false,
      year
    };
  }

  return null;
}

// =====================================
// DETECTAR FOCO
// =====================================

function detectBulb(message) {

  const match =
    message.match(
      /\b(H13|H11|H9|H7|H4|9004|9005|9006|9007|H1|H3|H16)\b/i
    );

  if (!match) {
    return null;
  }

  return match[0]
    .toUpperCase();
}

// =====================================
// DETECTAR COMPRA
// =====================================

function detectPurchaseIntent(
  message
) {

  const text =
    message.toLowerCase();

  return (
    text.includes("voy a querer") ||
    text.includes("quiero") ||
    text.includes("las de 500") ||
    text.includes("$500") ||
    text.includes("premium") ||
    text.includes("csp") ||
    text.includes("me llevo")
  );
}

// =====================================
// DETECTAR DOMICILIO
// =====================================

function detectDeliveryIntent(
  message
) {

  const text =
    message.toLowerCase();

  return (
    text.includes("domicilio") ||
    text.includes("entrega") ||
    text.includes("puedes venir")
  );
}

// =====================================
// DETECTAR INSTALACION
// =====================================

function detectInstallationIntent(
  message
) {

  const text =
    message.toLowerCase();

  return (
    text.includes("instalacion") ||
    text.includes("instalación") ||
    text.includes("instalar") ||
    text.includes("con instalación") ||
    text.includes("con instalacion") ||
    text.includes("las 2")
  );
}

// =====================================
// DETECTAR SI
// =====================================

function detectYes(message) {

  const text =
    message
      .toLowerCase()
      .trim();

  return (
    text === "si" ||
    text === "sí" ||
    text === "ok" ||
    text === "sale" ||
    text === "va" ||
    text === "simon"
  );
}

// =====================================
// DETECTAR DIRECCION
// =====================================

function looksLikeAddress(
  message
) {

  return (
    message.length >= 4 &&
    !detectVehicle(message) &&
    !detectPurchaseIntent(message)
  );
}

// =====================================
// SALUDO
// =====================================

function getGreeting() {

  const now =
    new Date();

  const hour = Number(
    new Intl.DateTimeFormat(
      "es-MX",
      {
        hour: "numeric",
        hour12: false,
        timeZone:
          "America/Tijuana"
      }
    ).format(now)
  );

  if (
    hour >= 5 &&
    hour < 12
  ) {

    return "Buenos días";
  }

  if (
    hour >= 20 ||
    hour < 5
  ) {

    return "Buenas noches";
  }

  return "Buenas tardes";
}

// =====================================
// OPENAI OEM
// =====================================

async function detectVehicleBulbsAI(
  vehicle
) {

  try {

    const normalizedVehicle =
      normalizeVehicleName(
        vehicle
      );

    console.log(
      "Consultando OpenAI:",
      normalizedVehicle
    );

    const completion =
      await openai.chat.completions.create({

        model:
          config.openai.model,

        temperature: 0,

        max_tokens: 120,

        response_format: {
          type: "json_object"
        },

        messages: [

          {
            role: "system",

            content: `
Eres experto OEM automotriz.

Detecta:
- high beam
- low beam

SOLO delanteros.

H13
H4
9004
9007

usan:
altas y bajas en el mismo foco.

JSON dual:

{
 "sameBulb": true,
 "bulb": "H4",
 "confidence": "high"
}

JSON separado:

{
 "sameBulb": false,
 "high": "9005",
 "low": "9006",
 "confidence": "high"
}

Si NO estás seguro:

{
 "confidence": "low"
}
`
          },

          {
            role: "user",
            content:
              normalizedVehicle
          }
        ]
      });

    const text =
      completion
        .choices[0]
        ?.message
        ?.content
        ?.trim();

    console.log(
      "Respuesta OpenAI:",
      text
    );

    if (!text) {
      return null;
    }

    const parsed =
      JSON.parse(text);

    if (
      parsed.confidence !==
      "high"
    ) {

      return null;
    }

    // =====================================
    // MISMO FOCO
    // =====================================

    if (
      parsed.sameBulb &&
      parsed.bulb
    ) {

      return {

        bulb:
          parsed.bulb
            .toUpperCase(),

        sameBulb: true
      };
    }

    // =====================================
    // SEPARADOS
    // =====================================

    if (
      parsed.sameBulb === false &&
      parsed.high &&
      parsed.low
    ) {

      return {

        bulb: {

          high:
            parsed.high
              .toUpperCase(),

          low:
            parsed.low
              .toUpperCase()
        },

        sameBulb: false
      };
    }

    return null;

  } catch (error) {

    console.log(
      "Error OpenAI:",
      error.message
    );

    return null;
  }
}

// =====================================
// OBTENER INFO
// =====================================

async function getVehicleInfo(
  vehicle
) {

  const normalized =
    normalizeVehicleName(
      vehicle
    );

  console.log(
    "Buscando vehículo:",
    normalized
  );

  // =====================================
  // BASE OEM MANUAL
  // =====================================

  if (
    knownVehicles[
      normalized
    ]
  ) {

    console.log(
      "Vehículo encontrado en base OEM"
    );

    return knownVehicles[
      normalized
    ];
  }

  // =====================================
  // CACHE LOCAL
  // =====================================

  const db =
    await loadVehicleDatabase();

  if (
    db[normalized]
  ) {

    console.log(
      "Vehículo encontrado en cache"
    );

    return db[normalized];
  }

  // =====================================
  // OPENAI
  // =====================================

  const result =
    await detectVehicleBulbsAI(
      normalized
    );

  if (!result) {

    console.log(
      "No se encontró información"
    );

    return null;
  }

  // =====================================
  // GUARDAR
  // =====================================

  db[normalized] =
    result;

  await saveVehicleDatabase(
    db
  );

  return result;
}

// =====================================
// RESPUESTA VEHICULO
// =====================================

function buildVehicleReply({

  vehicle,
  bulb,
  sameBulb

}) {

  const formattedVehicle =
    normalizeVehicleName(
      vehicle
    )
      .split(" ")
      .map(word =>
        word.charAt(0)
          .toUpperCase() +
        word.slice(1)
      )
      .join(" ");

  // =====================================
  // MISMO FOCO
  // =====================================

  if (sameBulb) {

    return `
[${formattedVehicle}]

🔦Usa ${bulb} para altas y bajas

· COB 2 Caras $250 MXN
  6,000 lúmenes
  ✅ 3 meses de garantía

· COB 4 Caras $350 MXN
  12,000 lúmenes
  ✅ 3 meses de garantía

· CSP Premium $500 MXN
  20,000 lúmenes
  ✅ 6 meses de garantía
⭐ (recomendado)

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
[${formattedVehicle}]

🔦Usa ${bulb.high} para las altas

· COB 2 Caras $200 MXN
  6,000 lúmenes
  ✅ 3 meses de garantía

· COB 4 Caras $300 MXN
  12,000 lúmenes
  ✅ 3 meses de garantía

· CSP Premium $450 MXN
  20,000 lúmenes
  ✅ 6 meses de garantía
⭐ (recomendado)

🔦Usa ${bulb.low} para las bajas

· COB 2 Caras $200 MXN
  6,000 lúmenes
  ✅ 3 meses de garantía

· COB 4 Caras $300 MXN
  12,000 lúmenes
  ✅ 3 meses de garantía

· CSP Premium $450 MXN
  20,000 lúmenes
  ✅ 6 meses de garantía
⭐ (recomendado)

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
// MAIN
// =====================================

export async function generateBotReply({

  customerMessage,
  customerPhone

}) {

  const greeting =
    getGreeting();

  const conversationId =
    customerPhone ||
    "default";

  const memory =
    conversationMemory.get(
      conversationId
    ) || {

      stage: "idle"
    };

  // =====================================
  // DETECTAR VEHICULO
  // =====================================

  const vehicleData =
    detectVehicle(
      customerMessage
    );

  // =====================================
  // VEHICULO COMPLETO
  // =====================================

  if (
    vehicleData?.complete
  ) {

    const vehicle =
      vehicleData.vehicle;

    const vehicleInfo =
      await getVehicleInfo(
        vehicle
      );

    if (vehicleInfo) {

      conversationMemory.set(
        conversationId,
        {
          vehicle,
          stage:
            "quoted"
        }
      );

      return buildVehicleReply({

        vehicle,

        bulb:
          vehicleInfo.bulb,

        sameBulb:
          vehicleInfo.sameBulb
      });
    }
  }

  // =====================================
  // SOLO MODELO
  // =====================================

  if (
    vehicleData?.model &&
    !vehicleData?.year
  ) {

    conversationMemory.set(
      conversationId,
      {
        ...memory,
        model:
          vehicleData.model,
        stage:
          "awaiting_year"
      }
    );

    return `
${greeting}

¿Qué año es su ${vehicleData.model}?
`.trim();
  }

  // =====================================
  // SOLO AÑO
  // =====================================

  if (
    vehicleData?.year &&
    memory?.model
  ) {

    const vehicle =
      `${memory.model} ${vehicleData.year}`;

    const vehicleInfo =
      await getVehicleInfo(
        vehicle
      );

    if (vehicleInfo) {

      conversationMemory.set(
        conversationId,
        {
          vehicle,
          stage:
            "quoted"
        }
      );

      return buildVehicleReply({

        vehicle,

        bulb:
          vehicleInfo.bulb,

        sameBulb:
          vehicleInfo.sameBulb
      });
    }
  }

  // =====================================
  // FALLBACK
  // =====================================

  return `
${greeting}

¿Cuál es el año y modelo
de su vehículo?
`.trim();
}
