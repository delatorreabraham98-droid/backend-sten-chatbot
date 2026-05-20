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

    return JSON.parse(file);

  } catch {

    return {};
  }
}

// =====================================
// GUARDAR DB
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
// OBTENER INFO
// =====================================

async function getVehicleInfo(
  vehicle
) {

  const normalized =
    normalizeVehicleName(
      vehicle
    );

  // =====================================
  // BASE MANUAL
  // =====================================

  if (
    knownVehicles[
      normalized
    ]
  ) {

    return knownVehicles[
      normalized
    ];
  }

  // =====================================
  // CACHE
  // =====================================

  const db =
    await loadVehicleDatabase();

  if (
    db[normalized]
  ) {

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
    return null;
  }

  db[normalized] =
    result;

  await saveVehicleDatabase(
    db
  );

  return result;
}

// =====================================
// RESPUESTA COTIZACION
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
  // FOCOS SEPARADOS
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
  // PRIORIDAD:
  // FLUJOS ACTIVOS
  // =====================================

  // =====================================
  // ESPERANDO ENTREGA
  // =====================================

  if (
    memory.stage ===
    "awaiting_delivery_type"
  ) {

    if (
      detectYes(
        customerMessage
      )
    ) {

      conversationMemory.set(
        conversationId,
        {
          ...memory,
          stage:
            "awaiting_address",
          installation:
            true,
          deliveryType:
            "domicilio"
        }
      );

      return `
Perfecto 👌

La instalación a domicilio
tiene costo adicional
de $100 MXN.

¿En qué colonia
se encuentra?
`.trim();
    }

    if (
      detectInstallationIntent(
        customerMessage
      ) &&
      detectDeliveryIntent(
        customerMessage
      )
    ) {

      conversationMemory.set(
        conversationId,
        {
          ...memory,
          stage:
            "awaiting_address",
          installation:
            true,
          deliveryType:
            "domicilio"
        }
      );

      return `
Perfecto 👌

La instalación a domicilio
tiene costo adicional
de $100 MXN.

¿En qué colonia
se encuentra?
`.trim();
    }

    if (
      detectInstallationIntent(
        customerMessage
      )
    ) {

      conversationMemory.set(
        conversationId,
        {
          ...memory,
          stage:
            "awaiting_address",
          installation:
            true
        }
      );

      return `
Perfecto 👌

¿En qué colonia
se encuentra?
`.trim();
    }

    if (
      detectDeliveryIntent(
        customerMessage
      )
    ) {

      conversationMemory.set(
        conversationId,
        {
          ...memory,
          stage:
            "awaiting_address",
          deliveryType:
            "domicilio"
        }
      );

      return `
Perfecto 👌

El servicio a domicilio
tiene costo adicional
de $100 MXN.

¿En qué colonia
se encuentra?
`.trim();
    }
  }

  // =====================================
  // ESPERANDO DIRECCION
  // =====================================

  if (
    memory.stage ===
    "awaiting_address"
  ) {

    if (
      looksLikeAddress(
        customerMessage
      )
    ) {

      conversationMemory.set(
        conversationId,
        {
          ...memory,
          stage:
            "awaiting_schedule",
          address:
            customerMessage
        }
      );

      return `
Perfecto 👌

¿Le queda hoy
o mañana?
`.trim();
    }
  }

  // =====================================
  // ESPERANDO HORARIO
  // =====================================

  if (
    memory.stage ===
    "awaiting_schedule"
  ) {

    conversationMemory.set(
      conversationId,
      {
        ...memory,
        stage:
          "completed",
        schedule:
          customerMessage
      }
    );

    return `
Perfecto 👌

Quedó agendada
su instalación.

En un momento
le confirmamos horario
por WhatsApp.

📱 686 471 9077
`.trim();
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
      [
        "H13",
        "H4",
        "9004",
        "9007"
      ].includes(
        manualBulb
      );

    const updatedData = {

      bulb: sameBulb
        ? manualBulb
        : {
            high:
              manualBulb,
            low:
              manualBulb
          },

      sameBulb
    };

    return buildVehicleReply({

      vehicle:
        memory.vehicle,

      bulb:
        updatedData.bulb,

      sameBulb:
        updatedData.sameBulb
    });
  }

  // =====================================
  // INTENCIONES MULTIPLES
  // =====================================

  const wantsPurchase =
    detectPurchaseIntent(
      customerMessage
    );

  const wantsDelivery =
    detectDeliveryIntent(
      customerMessage
    );

  const wantsInstallation =
    detectInstallationIntent(
      customerMessage
    );

  // =====================================
  // COMPRA
  // =====================================

  if (
    wantsPurchase &&
    memory?.vehicle
  ) {

    // =====================================
    // COMPRA + DOMICILIO + INSTALACION
    // =====================================

    if (
      wantsDelivery &&
      wantsInstallation
    ) {

      conversationMemory.set(
        conversationId,
        {
          ...memory,
          stage:
            "awaiting_address",
          selectedProduct:
            "CSP Premium",
          installation:
            true,
          deliveryType:
            "domicilio"
        }
      );

      return `
Órale 👌

Perfecto,
la instalación a domicilio
tiene costo adicional
de $100 MXN.

¿En qué colonia
se encuentra?
`.trim();
    }

    // =====================================
    // SOLO INSTALACION
    // =====================================

    if (
      wantsInstallation
    ) {

      conversationMemory.set(
        conversationId,
        {
          ...memory,
          stage:
            "awaiting_address",
          selectedProduct:
            "CSP Premium",
          installation:
            true
        }
      );

      return `
Perfecto 👌

¿En qué colonia
se encuentra?
`.trim();
    }

    // =====================================
    // SOLO DOMICILIO
    // =====================================

    if (
      wantsDelivery
    ) {

      conversationMemory.set(
        conversationId,
        {
          ...memory,
          stage:
            "awaiting_address",
          selectedProduct:
            "CSP Premium",
          deliveryType:
            "domicilio"
        }
      );

      return `
Perfecto 👌

El servicio a domicilio
tiene costo adicional
de $100 MXN.

¿En qué colonia
se encuentra?
`.trim();
    }

    // =====================================
    // SOLO COMPRA
    // =====================================

    conversationMemory.set(
      conversationId,
      {
        ...memory,
        stage:
          "awaiting_delivery_type",
        selectedProduct:
          "CSP Premium"
      }
    );

    return `
Órale 👌

La CSP Premium es la mejor opción,
da más claridad y dura más.

¿Quiere instalación
o entrega a domicilio?
`.trim();
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
      vehicleData.model &&
      !vehicleData.year
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
