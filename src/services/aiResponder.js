import OpenAI from "openai";
import fs from "fs/promises";
import path from "path";

import { config } from "../config.js";

import {
  detectSelectedProduct,
  detectConversationIntent
} from "./intentEngine.js";

import {
  generateSalesReply
} from "./salesEngine.js";

import {
  getCustomerMemory,
  saveCustomerMemory,
  increaseLeadScore
} from "./supabaseMemory.js";

import {
  createLead,
  createQuote
} from "./base44Service.js";

const openai = new OpenAI({
  apiKey: config.openai.apiKey
});

const DB_PATH = path.resolve("./vehicleBulbs.json");

const knownVehicles = {
  "ford focus 2002": {
    bulb: "H4",
    sameBulb: true
  }
};

const vehicleBrands = [
  "hummer",
  "toyota",
  "ford",
  "chevrolet",
  "chevy",
  "honda",
  "nissan",
  "mazda",
  "mitsubishi",
  "bmw",
  "audi",
  "mercedes",
  "kia",
  "hyundai"
];

const vehicleModels = [
  "focus",
  "civic",
  "lancer",
  "sentra",
  "corolla",
  "accord",
  "altima",
  "jetta",
  "fusion",
  "escape",
  "camry",
  "h3",
  "silverado",
  "tacoma",
  "rav4",
  "crv",
  "explorer",
  "ram",
  "malibu",
  "sierra"
];

const weakMessages = [
  "ok",
  "oka",
  "sale",
  "si",
  "sí",
  "va",
  "arre",
  "ajá",
  "aja",
  "gracias",
  "👍",
  "👌"
];

async function loadVehicleDatabase() {

  try {

    const file = await fs.readFile(DB_PATH, "utf8");

    return JSON.parse(file);

  } catch {

    return {};
  }
}

function normalizeVehicleName(vehicle) {

  let normalized = vehicle.toLowerCase();

  if (
    normalized.includes("focus") &&
    !normalized.includes("ford")
  ) {

    normalized = `ford ${normalized}`;
  }

  return normalized;
}

function detectVehicle(message) {

  const clean = message.toLowerCase();

  const yearMatch =
    clean.match(/\b(19|20)\d{2}\b/);

  const year =
    yearMatch ? yearMatch[0] : null;

  const foundBrand =
    vehicleBrands.find(
      brand => clean.includes(brand)
    );

  const foundModel =
    vehicleModels.find(
      model => clean.includes(model)
    );

  if (
    (foundBrand || foundModel) &&
    !year
  ) {

    return {
      incomplete: true,
      brand: foundBrand,
      model: foundModel
    };
  }

  if (
    year &&
    (foundBrand || foundModel)
  ) {

    return {
      complete: true,
      vehicle: `${foundBrand || ""} ${foundModel || ""} ${year}`
        .replace(/\s+/g, " ")
        .trim()
    };
  }

  return null;
}

async function getVehicleInfo(vehicle) {

  const normalized =
    normalizeVehicleName(vehicle);

  if (knownVehicles[normalized]) {

    return knownVehicles[normalized];
  }

  const db =
    await loadVehicleDatabase();

  if (db[normalized]) {

    return db[normalized];
  }

  return {
    bulb: "H4",
    sameBulb: true
  };
}

function buildVehicleReply({
  vehicle,
  bulb
}) {

  return `
[${vehicle}]

🔦 Usa ${bulb} para altas y bajas

· COB 2 Caras $250 MXN

· COB 4 Caras $350 MXN

· CSP Premium $500 MXN
⭐ Recomendado

¿Cuál desea?
`.trim();
}

function getGreeting() {

  return "Buenas tardes";
}

function isWeakMessage(message) {

  const clean =
    message.toLowerCase().trim();

  return weakMessages.includes(clean);
}

function buildContinueSaleReply() {

  return `
Seguimos con su cotización 👌

¿Cuál opción le interesa más?

· $250 económica
· $350 más potencia
· $500 premium
`.trim();
}

export async function generateBotReply({
  customerMessage,
  customerPhone
}) {

  const greeting = getGreeting();

  const conversationId =
    customerPhone || "default";

  const memory =
    await getCustomerMemory(
      conversationId
    );

  const text =
    customerMessage.toLowerCase();

  const conversationalIntent =
    detectConversationIntent(
      customerMessage
    );

  /*
    ===================================================
    STICKY SALES CONTEXT
    ===================================================
  */

  if (
    conversationalIntent &&
    memory.vehicle
  ) {

    const reply =
      generateSalesReply(
        conversationalIntent
      );

    if (reply) {

      return reply;
    }
  }

  /*
    ===================================================
    ANTI RESET FLOW
    ===================================================
  */

  if (
    memory.vehicle &&
    isWeakMessage(customerMessage)
  ) {

    if (memory.selected_product) {

      return `
Perfecto 👌

¿Desea instalación,
punto medio
o entrega a domicilio?
`.trim();
    }

    return buildContinueSaleReply();
  }

  /*
    ===================================================
    PRODUCT FOLLOW-UP INTELLIGENCE
    ===================================================
  */

  if (
    memory.vehicle &&
    !memory.selected_product
  ) {

    const selectedProduct =
      detectSelectedProduct(
        customerMessage
      );

    if (selectedProduct) {

      await saveCustomerMemory(
        conversationId,
        {
          ...memory,
          stage:
            "awaiting_delivery_type",
          selected_product:
            selectedProduct
        }
      );

      await increaseLeadScore(
        conversationId,
        15
      );

      return `
Perfecto 👌

Seleccionó:
${selectedProduct}

¿Desea instalación,
punto medio
o entrega a domicilio?
`.trim();
    }

    if (
      customerMessage.length < 40
    ) {

      return buildContinueSaleReply();
    }
  }

  /*
    ===================================================
    DELIVERY FLOW
    ===================================================
  */

  if (
    memory.stage ===
    "awaiting_delivery_type"
  ) {

    const wantsInstallation =
      text.includes("instalacion") ||
      text.includes("instalación");

    const wantsDelivery =
      text.includes("domicilio");

    const wantsMeetingPoint =
      text.includes("punto") ||
      text.includes("medio");

    if (
      wantsInstallation &&
      wantsDelivery
    ) {

      await saveCustomerMemory(
        conversationId,
        {
          ...memory,
          stage: "awaiting_address",
          delivery_type:
            "domicilio",
          installation: true
        }
      );

      await increaseLeadScore(
        conversationId,
        20
      );

      await createQuote({
        phone: conversationId,
        vehicle: memory.vehicle,
        product:
          memory.selected_product,
        delivery_type:
          "domicilio + instalación"
      });

      return `
Perfecto 👌

La instalación a domicilio
tiene costo adicional
de $100 MXN.

¿En qué colonia se encuentra?
`.trim();
    }

    if (wantsInstallation) {

      await saveCustomerMemory(
        conversationId,
        {
          ...memory,
          stage: "completed",
          installation: true
        }
      );

      return `
Perfecto 👌

La instalación tiene costo
de $100 MXN.

📱 686 471 9077

Puede mandar WhatsApp
para coordinar instalación.
`.trim();
    }

    if (wantsMeetingPoint) {

      await saveCustomerMemory(
        conversationId,
        {
          ...memory,
          stage:
            "awaiting_meeting_point"
        }
      );

      return `
Perfecto 👌

¿En cuál punto le queda mejor?

✅ Portales
✅ Juventud 2000
✅ Costco
✅ Soriana Anáhuac
✅ Smart & Final
✅ Plaza Mandarin
`.trim();
    }

    if (wantsDelivery) {

      await saveCustomerMemory(
        conversationId,
        {
          ...memory,
          stage: "awaiting_address",
          delivery_type:
            "domicilio"
        }
      );

      return `
Perfecto 👌

El envío a domicilio
tiene costo adicional
de $100 MXN.

¿En qué colonia se encuentra?
`.trim();
    }

    return `
¿Desea instalación,
punto medio
o entrega a domicilio?
`.trim();
  }

  /*
    ===================================================
    ADDRESS FLOW
    ===================================================
  */

  if (
    memory.stage ===
    "awaiting_address"
  ) {

    await saveCustomerMemory(
      conversationId,
      {
        ...memory,
        stage: "completed",
        address: customerMessage
      }
    );

    return `
Perfecto 👌

📍 Dirección guardada.

En un momento
le confirmamos horario.

📱 686 471 9077
`.trim();
  }

  /*
    ===================================================
    MEETING POINT FLOW
    ===================================================
  */

  if (
    memory.stage ===
    "awaiting_meeting_point"
  ) {

    await saveCustomerMemory(
      conversationId,
      {
        ...memory,
        stage: "completed",
        meeting_point:
          customerMessage
      }
    );

    return `
Perfecto 👌

📍 Punto guardado:
${customerMessage}

🚗 Vehículo:
${memory.vehicle}

🔦 Producto:
${memory.selected_product}

En un momento
le confirmamos horario.
`.trim();
  }

  /*
    ===================================================
    VEHICLE DETECTION
    ===================================================
  */

  const vehicleData =
    detectVehicle(customerMessage);

  /*
    ===================================================
    VEHICLE ONLY MODE
    ===================================================
  */

  if (vehicleData?.incomplete) {

    const vehicleName =
      vehicleData.model ||
      vehicleData.brand ||
      "vehículo";

    return `
¿Qué año es su ${vehicleName}?
`.trim();
  }

  /*
    ===================================================
    FULL VEHICLE DETECTED
    ===================================================
  */

  if (vehicleData?.complete) {

    const vehicle =
      vehicleData.vehicle;

    const vehicleInfo =
      await getVehicleInfo(vehicle);

    await saveCustomerMemory(
      conversationId,
      {
        ...memory,
        vehicle,
        stage: "quoted"
      }
    );

    await increaseLeadScore(
      conversationId,
      10
    );

    return buildVehicleReply({
      vehicle,
      bulb: vehicleInfo.bulb
    });
  }

  /*
    ===================================================
    CONTINUATION MEMORY
    ===================================================
  */

  if (memory.vehicle) {

    return buildContinueSaleReply();
  }

  /*
    ===================================================
    INITIAL GREETING
    ===================================================
  */

  return `
${greeting}

¿Cuál es el año y modelo
de su vehículo?
`.trim();
}
