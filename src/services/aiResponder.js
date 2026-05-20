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
// MEMORIA CONVERSACIONAL
// =====================================

const conversationMemory =
  new Map();

// =====================================
// VEHICULOS OEM VERIFICADOS
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
// CARGAR CACHE
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
// GUARDAR CACHE
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

  const cleanMessage =
    message
      .trim()
      .toLowerCase();

  const yearMatch =
    cleanMessage.match(
      /\b(19|20)\d{2}\b/
    );

  const year =
    yearMatch
      ? yearMatch[0]
      : null;

  const vehicleMatch =
    cleanMessage.match(
      /\b(camaro|focus|civic|lancer|silverado|sentra|corolla|accord|mustang|ram|altima|jetta|malibu|fusion|escape|sierra|tahoe|cruze)\b/i
    );

  const model =
    vehicleMatch
      ? vehicleMatch[0]
      : null;

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

  if (
    model &&
    !year
  ) {

    return {
      complete: false,
      model
    };
  }

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
// DETECTAR INTENCION DE COMPRA
// =====================================

function detectPurchaseIntent(
  message
) {

  const text =
    message.toLowerCase();

  return (
    text.includes("voy a querer") ||
    text.includes("me llevo") ||
    text.includes("quiero las") ||
    text.includes("las de 500") ||
    text.includes("las premium") ||
    text.includes("las csp") ||
    text.includes("me interesan")
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
    text.includes("instalar") ||
    text.includes("puedes venir") ||
    text.includes("a domicilio") ||
    text.includes("venir")
  );
}

// =====================================
// DETECTAR SALUDO
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

Identifica:
- foco high beam
- foco low beam

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

  const normalizedVehicle =
    normalizeVehicleName(
      vehicle
    );

  // =====================================
  // BASE OEM
  // =====================================

  if (
    knownVehicles[
      normalizedVehicle
    ]
  ) {

    return knownVehicles[
      normalizedVehicle
    ];
  }

  // =====================================
  // CACHE
  // =====================================

  const db =
    await loadVehicleDatabase();

  if (
    db[normalizedVehicle]
  ) {

    return db[
      normalizedVehicle
    ];
  }

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

  db[normalizedVehicle] =
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
    ) || {};

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
  // VEHICULO
  // =====================================

  const vehicleData =
    detectVehicle(
      customerMessage
    );

  // =====================================
  // FOCO MANUAL
  // =====================================

  const manualBulb =
    detectBulb(
      customerMessage
    );

  // =====================================
  // CLIENTE CORRIGE FOCO
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

      sameBulb
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
  // INTENCION DE COMPRA
  // =====================================

  if (
    detectPurchaseIntent(
      customerMessage
    ) &&
    memory?.vehicle
  ) {

    conversationMemory.set(
      conversationId,
      {
        ...memory,
        stage:
          "purchase_confirmed",
        selectedProduct:
          "CSP Premium"
      }
    );

    return `
Órale 👌

La CSP Premium es la mejor opción,
da más claridad y dura más.

¿Quiere instalación
o entrega?
`.trim();
  }

  // =====================================
  // INSTALACION / DOMICILIO
  // =====================================

  if (
    detectInstallationIntent(
      customerMessage
    ) &&
    memory?.vehicle
  ) {

    conversationMemory.set(
      conversationId,
      {
        ...memory,
        stage:
          "installation"
      }
    );

    return `
Sí 👌

El servicio a domicilio
tiene costo adicional
de $100 MXN.

¿En qué colonia se encuentra?
`.trim();
  }

  // =====================================
  // VEHICULO
  // =====================================

  if (vehicleData) {

    // =====================================
    // VEHICULO COMPLETO
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
            stage:
              "quoted"
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
            vehicle,
            stage:
              "quoted"
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
