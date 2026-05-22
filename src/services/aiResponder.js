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
  buildContinueSaleReply
} from "./salesEngine.js";

export async function generateAIReply({
  customerPhone,
  customerName,
  customerMessage
}) {

  const message = customerMessage.trim();
  const lower = message.toLowerCase();

  let memory = await getCustomerMemory(customerPhone);

  if (!memory) {

    memory = {
      phone: customerPhone,
      customer_name: customerName || "",
      vehicle: null,
      bulb: null,
      bulb_type: null,
      selected_product: null,
      conversation_stage: "new",
      lead_score: 0,
      last_seen_at: new Date().toISOString()
    };
  }

  memory.last_seen_at = new Date().toISOString();

  const detectedProduct = detectSelectedProduct(lower);
  const conversationalIntent = detectConversationIntent(lower);
  const vehicleData = findVehicleBulb(message);

  /*
    ==================================================
    VEHICLE DETECTION
    ==================================================
  */

  if (vehicleData) {

    memory.vehicle = vehicleData.vehicle;
    memory.bulb = vehicleData.bulb;
    memory.bulb_type = vehicleData.bulbType;
    memory.conversation_stage = "vehicle_selected";

    await saveCustomerMemory(customerPhone, memory);

    const bulbExplanation =
      vehicleData.bulbType === 'single'
        ? `🔦 Usa ${vehicleData.bulb} (1 función)\nSe ocupa un foco para bajas y otro para altas`
        : `🔦 Usa ${vehicleData.bulb} para altas y bajas`;

    return `
[${vehicleData.vehicle}]

${bulbExplanation}

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

  /*
    ==================================================
    SINGLE FUNCTION QUESTIONS
    ==================================================
  */

  if (
    memory.vehicle &&
    (
      lower.includes('1 funcion') ||
      lower.includes('1 función') ||
      lower.includes('una funcion') ||
      lower.includes('una función') ||
      lower.includes('altas y bajas separadas')
    )
  ) {

    return `
Correcto 👌

Su vehículo usa ${memory.bulb} de 1 función.

Se ocupa:
✅ un foco para bajas
✅ otro foco para altas

Las opciones disponibles son:

🔹 COB 2 Caras — $250
🔹 COB 4 Caras — $350
🔹 CSP Premium — $500 🔥

¿Cuál le interesa?
`.trim();
  }

  /*
    ==================================================
    PRODUCT FOLLOW-UP
    ==================================================
  */

  if (
    detectedProduct &&
    memory.vehicle
  ) {

    memory.selected_product = detectedProduct;
    memory.conversation_stage = "product_selected";
    memory.lead_score += 25;

    await saveCustomerMemory(customerPhone, memory);

    return `
Perfecto 👌

Seleccionó:
${detectedProduct}

¿Desea instalación,
punto medio
o entrega a domicilio?
`.trim();
  }

  /*
    ==================================================
    INSTALLATION
    ==================================================
  */

  if (
    memory.selected_product &&
    (
      lower.includes('instalacion') ||
      lower.includes('instalación')
    )
  ) {

    return `
Perfecto 👌

🔧 Instalación: +$100 MXN

📱 686 471 9077

¿Desea agendar hoy?
`.trim();
  }

  /*
    ==================================================
    DELIVERY
    ==================================================
  */

  if (
    memory.selected_product &&
    (
      lower.includes('domicilio') ||
      lower.includes('envio') ||
      lower.includes('envío') ||
      lower.includes('punto medio')
    )
  ) {

    return `
Perfecto 👌

📍 Podemos entregar en:

✅ Portales
✅ Juventud 2000
✅ Costco
✅ Plaza Mandarin

📱 686 471 9077
`.trim();
  }

  /*
    ==================================================
    PREMIUM QUESTIONS
    ==================================================
  */

  if (
    lower.includes('las buenas') ||
    lower.includes('premium') ||
    lower.includes('mejores') ||
    lower.includes('chafas')
  ) {

    return `
Las CSP Premium son las mejores 🔥

✅ Mucha más claridad
✅ Mejor duración
✅ Mejor alcance
✅ 6 meses garantía

¿Para qué vehículo las busca?
`.trim();
  }

  /*
    ==================================================
    STICKY SALES CONTEXT
    ==================================================
  */

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
