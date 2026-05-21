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

const openai = new OpenAI({
  apiKey: config.openai.apiKey
});

const DB_PATH = path.resolve("./vehicleBulbs.json");
const conversationMemory = new Map();

const knownVehicles = {
  "ford focus 2002": {
    bulb: "H4",
    sameBulb: true
  }
};

async function loadVehicleDatabase() {
  try {
    const file = await fs.readFile(DB_PATH,"utf8");
    return JSON.parse(file);
  } catch {
    return {};
  }
}

async function saveVehicleDatabase(data) {
  await fs.writeFile(DB_PATH,JSON.stringify(data,null,2),"utf8");
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

  const yearMatch = clean.match(/\b(19|20)\d{2}\b/);

  const year = yearMatch ? yearMatch[0] : null;

  const modelMatch = clean.match(/\b(focus|civic|lancer|sentra|corolla|accord|altima|jetta|fusion|escape)\b/i);

  const model = modelMatch ? modelMatch[0] : null;

  if (model && year) {
    return {
      complete: true,
      vehicle: `${model} ${year}`
    };
  }

  if (model && !year) {
    return {
      complete: false,
      model
    };
  }

  if (year && !model) {
    return {
      complete: false,
      year
    };
  }

  return null;
}

async function getVehicleInfo(vehicle) {

  const normalized = normalizeVehicleName(vehicle);

  if (knownVehicles[normalized]) {
    return knownVehicles[normalized];
  }

  const db = await loadVehicleDatabase();

  if (db[normalized]) {
    return db[normalized];
  }

  return {
    bulb: "H4",
    sameBulb: true
  };
}

function buildVehicleReply({ vehicle, bulb }) {

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

export async function generateBotReply({
  customerMessage,
  customerPhone
}) {

  const greeting = getGreeting();

  const conversationId = customerPhone || "default";

  const memory = conversationMemory.get(conversationId) || {
    stage: "idle"
  };

  const conversationalIntent = detectConversationIntent(customerMessage);

  if (conversationalIntent) {
    return generateSalesReply(conversationalIntent);
  }

  if (memory.stage === "awaiting_delivery_type") {

    const text = customerMessage.toLowerCase();

    if (
      text.includes("instalacion") ||
      text.includes("instalación")
    ) {

      conversationMemory.set(conversationId, {
        ...memory,
        stage: "completed"
      });

      return `
Perfecto.

La instalación tiene costo
de $100 MXN.

📱 686 471 9077
`.trim();
    }

    if (
      text.includes("punto") ||
      text.includes("medio")
    ) {

      conversationMemory.set(conversationId, {
        ...memory,
        stage: "awaiting_meeting_point"
      });

      return `
Perfecto.

¿En cuál punto le queda mejor?

✅ Portales
✅ Juventud 2000
✅ Costco
✅ Soriana Anáhuac
✅ Smart & Final
✅ Plaza Mandarin
`.trim();
    }

    if (
      text.includes("domicilio")
    ) {

      conversationMemory.set(conversationId, {
        ...memory,
        stage: "awaiting_address"
      });

      return `
Perfecto.

El envío a domicilio
tiene costo adicional
de $100 MXN.

¿En qué colonia se encuentra?
`.trim();
    }
  }

  if (memory.stage === "awaiting_meeting_point") {

    conversationMemory.set(conversationId, {
      ...memory,
      stage: "completed",
      meetingPoint: customerMessage
    });

    return `
Perfecto.

📍 Punto de entrega:
${customerMessage}

🚗 Vehículo:
${memory.vehicle}

🔦 Producto:
${memory.selectedProduct}

En un momento
le confirmamos horario.

📱 686 471 9077
`.trim();
  }

  const wantsPurchase = customerMessage.toLowerCase().includes("quiero");

  if (wantsPurchase && memory?.vehicle) {

    const selectedProduct = detectSelectedProduct(customerMessage);

    conversationMemory.set(conversationId, {
      ...memory,
      stage: "awaiting_delivery_type",
      selectedProduct
    });

    return `
Perfecto.

Seleccionó:
${selectedProduct}

¿Desea instalación,
punto medio
o entrega a domicilio?
`.trim();
  }

  const vehicleData = detectVehicle(customerMessage);

  if (vehicleData?.complete) {

    const vehicle = vehicleData.vehicle;

    const vehicleInfo = await getVehicleInfo(vehicle);

    conversationMemory.set(conversationId, {
      vehicle,
      stage: "quoted"
    });

    return buildVehicleReply({
      vehicle,
      bulb: vehicleInfo.bulb
    });
  }

  if (memory.stage !== "idle") {

    return `
Perdón.

¿Me puede explicar un poquito más
para ayudarle mejor?
`.trim();
  }

  return `
${greeting}

¿Cuál es el año y modelo
de su vehículo?
`.trim();
}
