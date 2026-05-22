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

  /*
    ===================================================
    LOAD MEMORY
    ===================================================
  */

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

  /*
    ===================================================
    UPDATE LAST SEEN
    ===================================================
  */

  memory.last_seen_at =
    new Date().toISOString();

  /*
    ===================================================
    NLP DETECTION
    ===================================================
  */

  const detectedProduct =
    detectSelectedProduct(
      lower
    );

  const conversationalIntent =
    detectConversationIntent(
      lower
    );

  /*
    ===================================================
    VEHICLE DETECTION
    ===================================================
  */

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

  /*
    ===================================================
    PRODUCT FOLLOW-UP
    ===================================================
  */

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

  /*
    ===================================================
    DELIVERY
    ===================================================
  */

  if (

    memory.selected_product &&

    (
      lower.includes("domicilio") ||
      lower.includes("envio") ||
      lower.includes("envío")
    )

  ) {

    memory.conversation_stage =
      "delivery";

    memory.lead_score += 20;

    await saveCustomerMemory(
      customerPhone,
      memory
    );

    return `
Perfecto 👌

🚘 Envío a domicilio:
+$100 MXN

📱 686 471 9077

Mándenos ubicación
para coordinar entrega.
`.trim();
  }

  /*
    ===================================================
    INSTALLATION
    ===================================================
  */

  if (

    memory.selected_product &&

    (
      lower.includes("instalacion") ||
      lower.includes("instalación")
    )

  ) {

    memory.conversation_stage =
      "installation";

    memory.lead_score += 20;

    await saveCustomerMemory(
      customerPhone,
      memory
    );

    return `
Perfecto 👌

🔧 Instalación:
+$100 MXN

📱 686 471 9077

¿Desea agendar hoy?
`.trim();
  }

  /*
    ===================================================
    NEGOTIATION
    ===================================================
  */

  if (
    conversationalIntent ===
    "negotiation"
  ) {

    memory.last_intent =
      "negotiation";

    await saveCustomerMemory(
      customerPhone,
      memory
    );

    return `
Le recomiendo muchísimo
las CSP Premium 🔥

Alumbran mucho más,
duran bastante
y tienen mejor claridad.

Muchos clientes primero
compran las económicas
y después terminan cambiando
a premium 👌
`.trim();
  }

  /*
    ===================================================
    QUALITY QUESTIONS
    ===================================================
  */

  if (
    conversationalIntent ===
    "quality_question"
  ) {

    memory.last_intent =
      "quality_question";

    memory.lead_score += 10;

    await saveCustomerMemory(
      customerPhone,
      memory
    );

    return `
Sí alumbran bastante 👌

Las CSP Premium son
las que más recomendamos
porque tienen:

✅ mejor claridad
✅ más duración
✅ mejor alcance
✅ 6 meses garantía
`.trim();
  }

  /*
    ===================================================
    PRODUCT COMPARISON
    ===================================================
  */

  if (
    conversationalIntent ===
    "product_comparison"
  ) {

    await saveCustomerMemory(
      customerPhone,
      memory
    );

    return `
La diferencia principal 👌

🔹 COB 2 Caras
Más económicas.

🔹 COB 4 Caras
Más iluminación.

🔹 CSP Premium
La mejor claridad
y más duración 🔥

Las Premium son
las más recomendadas.
`.trim();
  }

  /*
    ===================================================
    HESITATION
    ===================================================
  */

  if (
    conversationalIntent ===
    "hesitation"
  ) {

    memory.last_intent =
      "hesitation";

    await saveCustomerMemory(
      customerPhone,
      memory
    );

    return `
Claro 👌

Cuando guste
aquí seguimos.

Las CSP Premium
son las más buscadas 🔥
`.trim();
  }

  /*
    ===================================================
    CONFIRMATION
    ===================================================
  */

  if (
    conversationalIntent ===
    "confirmation"
  ) {

    if (
      memory.selected_product
    ) {

      return `
Perfecto 👌

Seguimos con:

${memory.selected_product}

¿Desea instalación,
punto medio
o entrega?
`.trim();
    }

    return `
Perfecto 👌

¿En qué vehículo
instalaríamos las luces?
`.trim();
  }

  /*
    ===================================================
    ANGRY CUSTOMER
    ===================================================
  */

  if (
    conversationalIntent ===
    "angry_customer"
  ) {

    return `
Disculpe 🙏

Estoy para ayudarle.

Seguimos con su cotización
sin problema 👌
`.trim();
  }

  /*
    ===================================================
    CANCEL
    ===================================================
  */

  if (
    conversationalIntent ===
    "cancel"
  ) {

    memory.conversation_stage =
      "cancelled";

    await saveCustomerMemory(
      customerPhone,
      memory
    );

    return `
Claro 👌

Si después gusta información
sobre luces LED,
aquí seguimos.
`.trim();
  }

  /*
    ===================================================
    CONTINUE SALE CONTEXT
    ===================================================
  */

  if (
    memory.vehicle &&
    !memory.selected_product
  ) {

    return buildContinueSaleReply();
  }

  /*
    ===================================================
    DEFAULT GREETING
    ===================================================
  */

  return `
Buenas tardes

¿Cuál es el año y modelo
de su vehículo?
`.trim();
}
