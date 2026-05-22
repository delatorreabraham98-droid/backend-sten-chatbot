import {
  detectProductIntent,
  buildProductReply,
  detectObjection,
  buildObjectionReply
} from "./intentEngine.js";

import {
  getCustomerMemory,
  saveCustomerMemory
} from "./supabaseMemory.js";

import {
  detectVehicleInfo,
  buildVehicleResponse
} from "./vehicleEngine.js";

import {
  webVehicleLookup
} from "./webVehicleLookup.js";

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
      bulb_low: null,
      bulb_high: null,
      bulb_type: null,
      selected_product: null,
      conversation_stage: "new",
      lead_score: 0,
      last_seen_at: new Date().toISOString()
    };
  }

  memory.last_seen_at = new Date().toISOString();

  const vehicleInfo = detectVehicleInfo(message);
  const productIntent = detectProductIntent(message);
  const objectionType = detectObjection(message);

  /*
    ==================================================
    VEHICLE DETECTION
    ==================================================
  */

  if (vehicleInfo) {

    memory.vehicle = vehicleInfo.model;
    memory.vehicle_year = vehicleInfo.year;
    memory.bulb_low = vehicleInfo.lowBeam;
    memory.bulb_high = vehicleInfo.highBeam;
    memory.bulb_type = vehicleInfo.type;
    memory.conversation_stage = "vehicle_selected";

    await saveCustomerMemory(customerPhone, memory);

    return buildVehicleResponse(vehicleInfo);
  }

  /*
    ==================================================
    WEB VEHICLE LOOKUP — fallback for brands not in DB
    ==================================================
  */

  if (!vehicleInfo) {
    const yearMatch = message.match(/\b(19|20)\d{2}\b/);
    const year = yearMatch ? yearMatch[0] : null;

    const webResult = await webVehicleLookup({ message, year });

    if (webResult) {

      memory.vehicle = webResult.model;
      memory.vehicle_year = webResult.year;
      memory.bulb_low = webResult.lowBeam;
      memory.bulb_high = webResult.highBeam;
      memory.bulb_type = webResult.type;
      memory.conversation_stage = "vehicle_selected";

      await saveCustomerMemory(customerPhone, memory);

      return buildVehicleResponse(webResult);
    }
  }

  /*
    ==================================================
    OBJECTIONS
    ==================================================
  */

  if (objectionType) {
    return buildObjectionReply(objectionType);
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

Su vehículo usa ${memory.bulb_low || memory.bulb_high} de 1 función.

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
    BULB CODE CORRECTION — user says "usa 9007"
    ==================================================
  */

  if (memory.vehicle) {
    const verbPattern = /\b(?:usa|ocupa|lleva|necesito|es|son)\s+(?:el\s+|la\s+|foco\s+|focos\s+)?/;
    const bulbPattern = /\b(h\d{1,2}|9\d{3}|d[1-4][rs]|5202|88[01]|744[03]|194|921|912)\b/;
    const verbMatch = lower.match(verbPattern);

    if (verbMatch) {
      const restAfterVerb = lower.slice(verbMatch[0].length);
      const bulbMatch = restAfterVerb.match(bulbPattern);

      if (bulbMatch) {
        const code = bulbMatch[1].toUpperCase();

        const lowBeam = lower.match(/(?:bajas|baja|bajo)\s+((?:h\d{1,2}|9\d{3}|d[1-4][rs]|5202|88[01]|744[03]|194|921|912))/i);
        const highBeam = lower.match(/(?:altas|alta|alto)\s+((?:h\d{1,2}|9\d{3}|d[1-4][rs]|5202|88[01]|744[03]|194|921|912))/i);

        if (lowBeam || highBeam) {
          if (lowBeam) memory.bulb_low = lowBeam[1].toUpperCase();
          if (highBeam) memory.bulb_high = highBeam[1].toUpperCase();
          memory.bulb_type = memory.bulb_low !== memory.bulb_high ? "split" : "dual";
        } else {
          memory.bulb_low = code;
          memory.bulb_high = code;
          memory.bulb_type = "dual";
        }

        await saveCustomerMemory(customerPhone, memory);

        const displayBulbs = memory.bulb_low === memory.bulb_high
          ? `✅ Corregido a ${memory.bulb_low}`
          : `✅ Bajas: ${memory.bulb_low} | Altas: ${memory.bulb_high}`;

        return `
${displayBulbs}

Seguimos con su ${memory.vehicle}

Opciones disponibles:

🔹 COB 2 Caras — $250
🔹 COB 4 Caras — $350
🔹 CSP Premium — $500 🔥

¿Cuál le interesa?
`.trim();
      }
    }
  }

  /*
    ==================================================
    PRODUCT FOLLOW-UP
    ==================================================
  */

  if (
    productIntent &&
    memory.vehicle
  ) {

    memory.selected_product = productIntent.product;
    memory.conversation_stage = "product_selected";
    memory.lead_score += 25;

    await saveCustomerMemory(customerPhone, memory);

    const vehicleForReply = {
      lowBeam: memory.bulb_low,
      highBeam: memory.bulb_high
    };

    return buildProductReply(productIntent, vehicleForReply);
  }

  /*
    ==================================================
    AFFIRMATIVE RESPONSE AFTER PRODUCT SELECTION
    ==================================================
  */

  if (
    memory.selected_product &&
    (
      lower === 'si' ||
      lower === 'sí' ||
      lower === 'yes' ||
      lower.startsWith('si ') ||
      lower.startsWith('sí ')
    )
  ) {

    return `
Perfecto 👌

${memory.selected_product}

¿Desea:
✅ instalación
✅ punto medio
✅ entrega a domicilio?
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
    !memory.vehicle &&
    (
      lower.includes('las buenas') ||
      lower.includes('premium') ||
      lower.includes('mejores') ||
      lower.includes('chafas')
    )
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
    STICKY SALES CONTEXT — vehicle known, no product
    ==================================================
  */

  if (
    memory.vehicle &&
    !memory.selected_product
  ) {

    return buildContinueSaleReply();
  }

  /*
    ==================================================
    STICKY SALES CONTEXT — product already selected
    ==================================================
  */

  if (
    memory.vehicle &&
    memory.selected_product
  ) {

    return `
Seguimos con su pedido 👌

${memory.selected_product}

¿Desea:
✅ instalación
✅ punto medio
✅ entrega a domicilio?
`.trim();
  }

  return `
Buenas tardes

¿Cuál es el año y modelo
de su vehículo?
`.trim();
}

export const generateBotReply = generateAIReply;
