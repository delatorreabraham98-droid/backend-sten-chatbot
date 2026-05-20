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
// BASE OEM MANUAL
// =====================================

const knownVehicles = {

  // =====================================
  // FORD
  // =====================================

  "ford focus 2002": {
    bulb: "H4",
    sameBulb: true
  },

  "ford focus 2001": {
    bulb: "H4",
    sameBulb: true
  },

  "ford focus 2003": {
    bulb: "H4",
    sameBulb: true
  },

  // =====================================
  // MITSUBISHI
  // =====================================

  "mitsubishi lancer 2003": {
    bulb: "9007",
    sameBulb: true
  },

  // =====================================
  // HONDA
  // =====================================

  "honda civic 2010": {
    bulb: {
      high: "9005",
      low: "9006"
    },
    sameBulb: false
  },

  // =====================================
  // CHEVROLET
  // =====================================

  "chevrolet camaro 2010": {
    bulb: "H13",
    sameBulb: true
  }
};

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

  // =====================================
  // AÑO
  // =====================================

  const yearMatch =
    cleanMessage.match(
      /\b(19|20)\d{2}\b/
    );

  const year =
    yearMatch
      ? yearMatch[0]
      : null;

  // =====================================
  // MODELO
  // =====================================

  const vehicleMatch =
    cleanMessage.match(
      /\b(camaro|focus|civic|lancer|silverado|sentra|corolla|accord|mustang|ram|altima|jetta|malibu|fusion|escape|sierra|tahoe|cruze)\b/i
    );

  const model =
    vehicleMatch
      ? vehicleMatch[0]
      : null;

  // =====================================
  // COMPLETO
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
// OPENAI DETECCION
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
Eres un experto OEM automotriz.

Tu tarea es identificar:
- foco high beam
- foco low beam

SOLO focos delanteros.

NO identifiques:
- niebla
- reversa
- stop
- DRL
- interior

IMPORTANTE:

H13
H4
9004
9007

significan:
altas y bajas en el mismo foco.

Responde SOLO JSON.

Formato dual:

{
  "sameBulb": true,
  "bulb": "H4",
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

NO inventes.
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

  } catch {

    return null;
  }
}

// =====================================
// OBTENER INFO
// =====================================

async function getVehicleInfo(
  vehicle
) {

  const normalizedVehicle =
    normalizeVehicleName(
      vehicle
    );

  // =====================================
  // BASE MANUAL OEM
  // =====================================

  if (
    knownVehicles[
      normalizedVehicle
    ]
  ) {

    console.log(
      "Vehículo encontrado en base OEM"
    );

    return knownVehicles[
      normalizedVehicle
    ];
  }

  // =====================================
  // CACHE LOCAL
  // =====================================

  const db =
    await loadVehicleDatabase();

  if (
    db[normalizedVehicle]
  ) {

    console.log(
      "Vehículo encontrado localmente"
    );

    return db[
      normalizedVehicle
    ];
  }

  console.log(
    "Consultando OpenAI..."
  );

  // =====================================
  // OPENAI
  // =====================================

  const result =
    await detectVehicleBulbsAI(
      normalizedVehicle
    );

  if (!result) {
    return null;
  }

  // =====================================
  // GUARDAR CACHE
  // =====================================

  db[normalizedVehicle] =
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
// FUNCION PRINCIPAL
// =====================================

export async function generateBotReply({

  customerMessage,
  customerPhone

}) {

  const conversationId =
    customerPhone ||
    "default";

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

  const vehicleData =
    detectVehicle(
      customerMessage
    );

  // =====================================
  // DETECTAR FOCO
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

    const db =
      await loadVehicleDatabase();

    db[
      normalizeVehicleName(
        memory.vehicle
      )
    ] = updatedData;

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
  // VEHICULO
  // =====================================

  if (vehicleData) {

    // =====================================
    // COMPLETO
    // =====================================

    if (
      vehicleData.complete
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
            model:
              vehicle
                .split(" ")[0]
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
    }

    // =====================================
    // SOLO MODELO
    // =====================================

    if (
      vehicleData.model &&
      !vehicleData.year
    ) {

      conversationMemory.set(
        conversationId,
        {
          ...memory,
          model:
            vehicleData.model
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
      vehicleData.year &&
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
