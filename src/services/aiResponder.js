import {
  detectSelectedProduct,
  detectConversationIntent
} from "./intentEngine.js";

import {
  getCustomerMemory,
  saveCustomerMemory
} from "./supabaseMemory.js";

import {
  findVehicleBulb
} from "./vehicleEngine.js";

import {
  generateSalesReply,
  generateObjectionReply,
  generatePersuasionReply,
  buildContinueSaleReply
} from "./salesEngine.js";

export async function generateAIReply({
  customerPhone,
  customerName,
  customerMessage
}) {

  const message =
    customerMessage.trim();

  const lower =
    message.toLowerCase();

  let memory =
    await getCustomerMemory(
      customerPhone
    );

  if (!memory) {

    memory = {
      phone: customerPhone,
      customer_name:
        customerName || "",
      vehicle: null,
      bulb: null,
      selected_product: null,
      last_intent: null,
      conversation_stage:
        "new",
      lead_score: 0,
      last_seen_at:
        new Date().toISOString(),
      abandoned: false
    };
  }

  memory.last_seen_at =
    new Date().toISOString();

  const detectedProduct =
    detectSelectedProduct(
      lower
    );

  const conversationalIntent =
    detectConversationIntent(
      lower
    );

  const vehicleData =
    findVehicleBulb(message);

  if (vehicleData) {

    memory.vehicle =
      vehicleData.vehicle;

    memory.bulb =
      vehicleData.bulb;

    memory.conversation_stage =
      "vehicle_selected";

    memory.lead_score += 15;

    await saveCustomerMemory(
      customerPhone,
      memory
    );

    return `
[${vehicleData.vehicle}]

🔦 Usa ${vehicleData.bulb} para altas y bajas

· COB 2 Caras $250 MXN
  ✅ 3 meses garantía

· COB 4 Caras $350 MXN
  ✅ 3 meses garantía

· CSP Premium $500 MXN
  ✅ 6 meses garantía
⭐ Recomendado

¿Cuál desea?
`.trim();
  }

  if (
    detectedProduct &&
    memory.vehicle
  ) {

    memory.selected_product =
      detectedProduct;

    memory.conversation_stage =
      "product_selected";

    memory.lead_score += 25;

    await saveCustomerMemory(
      customerPhone,
      memory
    );

    return `
Perfecto 👌

Seleccionó:
${detectedProduct}

¿Desea instalación,
punto medio
o entrega a domicilio?
`.trim();
  }

  if (
    memory.vehicle &&
    !memory.selected_product
  ) {
    return buildContinueSaleReply();
  }

  return `
Buenas tardes

¿Cuál es el año y modelo
de su vehículo?
`.trim();
}

export const generateBotReply = generateAIReply;
