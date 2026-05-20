import OpenAI from "openai";
import fs from "fs/promises";
import path from "path";

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
// MEMORIA SIMPLE
// =====================================

const conversationMemory =
  new Map();

// =====================================
// CARGAR BASE
// =====================================

async function loadVehicleDatabase() {

  try {

    const file =
      await fs.readFile(
        DB_PATH,
        "utf8"
      );

    return JSON.parse(file);

  } catch {

    return {};

  }
}

// =====================================
// GUARDAR BASE
// =====================================

async function saveVehicleDatabase(
  data
) {

  await fs.writeFile(
    DB_PATH,
    JSON.stringify(
      data,
      null,
      2
    ),
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
    /\b(?:para|ocupo|busco|quiero|necesito|par)\s+(?:un\s+|una\s+)?([a-z]+(?:\s+[a-z0-9]+)?)\s+((19|20)\d{2})\b/i;

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
// DETECTAR FOCO MANUAL
// =====================================

function detectBulb(message) {

  const match = message.match(
    /\b(H13|H11|H9|H7|H4|9004|9005|9006|9007|H1|H3|H16)\b/i
  );

  if (!match) {
    return null;
  }

  return match[0]
    .toUpperCase();
}

// =====================================
// SALUDO
// =====================================

function shouldIncludeGreeting(
  message
) {

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
// FOCOS DUALES
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
// NORMALIZAR MARCAS
// =====================================

function normalizeVehicleName(
  vehicle
) {

  let normalized =
    vehicle;

  if (
    vehicle.includes("lancer") &&
    !vehicle.includes("mitsubishi")
  ) {

    normalized =
      `mitsubishi ${vehicle}`;
  }

  if (
    vehicle.includes("civic") &&
    !vehicle.includes("honda")
  ) {

    normalized =
      `honda ${vehicle}`;
  }

  if (
    vehicle.includes("camaro") &&
    !vehicle.includes("chevrolet")
  ) {

    normalized =
      `chevrolet ${vehicle}`;
  }

  if (
    vehicle.includes("focus") &&
    !vehicle.includes("ford")
  ) {

    normalized =
      `ford ${vehicle}`;
  }

  if (
    vehicle.includes("silverado") &&
    !vehicle.includes("chevrolet")
  ) {

    normalized =
      `chevrolet ${vehicle}`;
  }

  return normalized;
}

// =====================================
// DETECTAR FOCO CON OPENAI
// =====================================

async function detectVehicleBulbsAI(
  vehicle
) {

  try {

    const normalizedVehicle =
      normalizeVehicleName(
        vehicle
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
Eres un experto automotriz OEM especializado en compatibilidad de focos delanteros.

Tu tarea es identificar SOLAMENTE:

- high beam headlight bulb
- low beam headlight bulb

NO debes identificar:
- niebla
- DRL
- interior
- stop
- reversa
- cuartos

IMPORTANTE:

H13
H4
9004
9007

significan:
altas y bajas en el mismo foco.

Debes responder SOLO JSON.

Formato dual:

{
  "sameBulb": true,
  "bulb": "9007",
  "confidence": "high"
}

Formato separado:

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

REGLAS:
- SOLO responde high confidence
- NO inventes
- NO adivines
- Prioriza OEM fitment
- Usa información OEM real
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

    if (!text) {
      return null;
    }

    const parsed =
      JSON.parse(text);

    // =====================================
    // LOW CONFIDENCE
    // =====================================

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

        sameBulb: true,

        source:
          "openai"
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

        sameBulb: false,

        source:
          "openai"
      };
    }

    return null;

  } catch (error) {

    console.log(
      "OpenAI bulb detection error:",
      error.message
    );

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
    "Consultando OpenAI..."
  );

  // =====================================
  // OPENAI DETECCION
  // =====================================

  const result =
    await detectVehicleBulbsAI(
      vehicle
    );

  if (!result) {
    return null;
  }

  // =====================================
  // GUARDAR CACHE
  // =====================================

  db[vehicle] =
    result;

  await saveVehicleDatabase(
    db
  );

  console.log(
    "Vehículo guardado localmente"
  );

  return result;
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
${greetingText}[${formattedVehicle}]

🔦Usa ${bulb.high} para las altas

· COB 2 Caras $200 MXN 6,000 lúmenes 
✅ 3 meses de garantía

· COB 4 Caras $300 MXN 12,000 lúmenes 
✅ 3 meses de garantía

· CSP Premium $450 MXN 20,000 lúmenes 
✅ 6 meses de garantía ⭐ (recomendado)

🔦Usa ${bulb.low} para las bajas

· COB 2 Caras $200 MXN 6,000 lúmenes 
✅ 3 meses de garantía

· COB 4 Caras $300 MXN 12,000 lúmenes 
✅ 3 meses de garantía

· CSP Premium $450 MXN 20,000 lúmenes 
✅ 6 meses de garantía ⭐ (recomendado)

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
  customerPhone

}) {

  // =====================================
  // ID CONVERSACION
  // =====================================

  const conversationId =
    customerPhone ||
    "default";

  // =====================================
  // MEMORIA
  // =====================================

  const memory =
    conversationMemory.get(
      conversationId
    );

  // =====================================
  // SALUDO
  // =====================================

  const now = new Date();

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
  // DETECTAR FOCO MANUAL
  // =====================================

  const manualBulb =
    detectBulb(
      customerMessage
    );

  // =====================================
  // CORRECCION MANUAL
  // =====================================

  if (
    manualBulb &&
    memory?.vehicle
  ) {

    const sameBulb =
      isDualBeamBulb(
        manualBulb
      );

    const updatedData = {

      bulb: sameBulb
        ? manualBulb
        : {
            high:
              manualBulb,

            low:
              manualBulb ===
              "9005"
                ? "9006"
                : manualBulb
          },

      sameBulb,

      source:
        "manual"
    };

    // =====================================
    // GUARDAR CACHE
    // =====================================

    const db =
      await loadVehicleDatabase();

    db[memory.vehicle] =
      updatedData;

    await saveVehicleDatabase(
      db
    );

    return buildVehicleReply({

      greeting,

      includeGreeting:
        shouldIncludeGreeting(
          customerMessage
        ),

      vehicle:
        memory.vehicle,

      bulb:
        updatedData.bulb,

      sameBulb:
        updatedData.sameBulb
    });
  }

  // =====================================
  // VEHICULO DETECTADO
  // =====================================

  if (vehicle) {

    const vehicleInfo =
      await getVehicleInfo(
        vehicle
      );

    if (vehicleInfo) {

      conversationMemory.set(
        conversationId,
        {
          vehicle
        }
      );

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
  // FALLBACK SIMPLE
  // =====================================

  return `
${greeting}

¿Cuál es el año y modelo
de su vehículo?
`.trim();
}
