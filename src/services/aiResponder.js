import {
  getCustomerMemory,
  saveCustomerMemory,
  getConversationHistory,
  saveConversationMessages
} from "./supabaseMemory.js";

import {
  detectVehicleInfo
} from "./vehicleEngine.js";

import {
  webVehicleLookup
} from "./webVehicleLookup.js";

import {
  detectProductIntent,
  buildProductReply,
  buildObjectionReply
} from "./intentEngine.js";

import { sendWhatsAppTextMessage } from "./metaWhatsApp.js";
import { config } from "../config.js";

function getGreeting() {
  const hour = new Date().getHours();
  if (hour < 12) return "Buenos días";
  if (hour < 18) return "Buenas tardes";
  return "Buenas noches";
}

function getDefaultMemory(phone, name) {
  return {
    phone,
    customer_name: name || "",
    vehicle: null,
    vehicle_year: null,
    bulb_low: null,
    bulb_high: null,
    bulb_type: null,
    selected_product: null,
    conversation_stage: "new",
    lead_score: 0,
    last_seen_at: new Date().toISOString()
  };
}

async function notifyAdmin(title, details) {
  if (!config.adminWhatsappNumber) return;
  const msg = ["🔔 *" + title + "*", "", ...details].join("\n");
  sendWhatsAppTextMessage({ to: config.adminWhatsappNumber, body: msg }).catch(() => {});
}

/* ──────────────────────────────────────────────
   TOOL SCHEMAS — OpenAI function-calling format
   ────────────────────────────────────────────── */

const TOOL_DEFS = [
  {
    name: "vehicleLookup",
    description: "Busca un vehículo en la base de datos local. Devuelve códigos de bulbos (H7, 9005, etc) y tipo de foco. Ej: 'rav4 2019', 'civic 2020', 'sentra'",
    parameters: {
      type: "object",
      properties: {
        message: { type: "string", description: "El mensaje del cliente donde menciona el vehículo (marca y modelo)" }
      },
      required: ["message"]
    }
  },
  {
    name: "webVehicleLookup",
    description: "Busca un vehículo en internet cuando no está en la base de datos local. Para marcas como Mazda, Hyundai, Kia, BMW, Audi, etc. Ej: 'mazda cx5 2020', 'kia rio 2018'",
    parameters: {
      type: "object",
      properties: {
        message: { type: "string", description: "El mensaje con la marca y modelo del vehículo" }
      },
      required: ["message"]
    }
  },
  {
    name: "productLookup",
    description: "Obtiene el precio, descripción y compatibilidad de un producto para el vehículo del cliente. Siempre devuelve la respuesta completa lista para enviar.",
    parameters: {
      type: "object",
      properties: {
        product: {
          type: "string",
          enum: ["COB_2_CARAS", "COB_4_CARAS", "CSP_PREMIUM"],
          description: "Producto: COB_2_CARAS ($250), COB_4_CARAS ($350), CSP_PREMIUM ($500)"
        }
      },
      required: ["product"]
    }
  },
  {
    name: "objectionHandler",
    description: "Maneja objeciones del cliente. Usar cuando el cliente dice que algo es caro, que ya compró y salieron malas, o que no le gusta la calidad.",
    parameters: {
      type: "object",
      properties: {
        objectionType: {
          type: "string",
          enum: ["PRICE_OBJECTION", "BAD_PREVIOUS_EXPERIENCE"],
          description: "PRICE_OBJECTION = dice que es caro. BAD_PREVIOUS_EXPERIENCE = ya compró y salieron malas."
        }
      },
      required: ["objectionType"]
    }
  },
  {
    name: "getDeliveryInfo",
    description: "Obtiene los puntos de entrega disponibles, costo de instalación y costo de delivery a domicilio.",
    parameters: { type: "object", properties: {} }
  },
  {
    name: "getBusinessInfo",
    description: "Obtiene información del negocio: dirección, teléfono, horario, garantía de productos.",
    parameters: { type: "object", properties: {} }
  },
  {
    name: "saveMemory",
    description: "LLAMA ESTA HERRAMIENTA cuando el cliente te diga información nueva como: su vehículo, año, producto que le interesa, o cuando avance en la conversación. Ej: si dice 'tengo un civic 2018', primero llama vehicleLookup, y si no está en DB, llama esta para guardar lo que puedas.",
    parameters: {
      type: "object",
      properties: {
        vehicle: { type: "string", description: "Modelo del vehículo (ej: RAV4, CIVIC, SENTRA)" },
        vehicle_year: { type: "string", description: "Año del vehículo (ej: 2019)" },
        selected_product: { type: "string", description: "Producto que el cliente eligió: COB_2_CARAS, COB_4_CARAS, o CSP_PREMIUM" },
        conversation_stage: {
          type: "string",
          enum: ["new", "vehicle_identified", "product_selected", "completed"],
          description: "new = cliente nuevo, vehicle_identified = ya sabemos su vehículo, product_selected = ya eligió producto, completed = venta completada"
        }
      }
    }
  }
];

/* ──────────────────────────────────────────────
   SYSTEM PROMPT TEMPLATE
   ────────────────────────────────────────────── */

function buildSystemPrompt({ history, memory, customerName }) {
  const memoryStr = memory
    ? [
        "Vehículo: " + (memory.vehicle || "desconocido") + (memory.vehicle_year ? " " + memory.vehicle_year : ""),
        "Producto seleccionado: " + (memory.selected_product || "ninguno"),
        "Etapa: " + (memory.conversation_stage || "nueva"),
        "Lead score: " + (memory.lead_score || 0)
      ].join("\n")
    : "Cliente nuevo, sin datos previos";

  const historyStr = history.length > 0
    ? history.map(m => (m.role === "customer" ? "Cliente: " : "Bot: ") + m.message).join("\n")
    : "Sin historial previo";

  return [
    "Eres un vendedor de La Torre LED Shop en Mexicali. Vendes focos LED para auto.",
    "",
    "INSTRUCCIONES:",
    "- Sé natural, como vendedor en persona. No suenes robótico.",
    "- USA LAS HERRAMIENTAS para datos exactos. NUNCA inventes precios, bulbos ni direcciones.",
    "- Si el cliente menciona un vehículo, llama vehicleLookup o webVehicleLookup para obtener datos reales.",
    "- Después de mostrar productos, pregunta cuál le interesa.",
    "- Para respuestas de audio: sé BREVE (máximo 3 oraciones).",
    "- Si es texto, puedes dar más detalles.",
    "- Después de que el cliente elija producto, confirma su selección.",
    "",
    "HISTORIAL DE CONVERSACIÓN:",
    historyStr,
    "",
    "MEMORIA DEL CLIENTE:",
    memoryStr,
    "",
    "CLIENTE: " + (customerName || "Desconocido"),
    "",
    "HERRAMIENTAS DISPONIBLES:",
    "- vehicleLookup: buscar vehículo en DB local (Toyota, Nissan, Honda, Chevrolet, Ford, Mitsubishi)",
    "- webVehicleLookup: buscar vehículo en internet (otras marcas)",
    "- productLookup: obtener precio y descripción de producto con bulbos correctos",
    "- objectionHandler: manejar objeciones de precio o mala experiencia",
    "- getDeliveryInfo: puntos de entrega y costos",
    "- getBusinessInfo: dirección, horario, teléfono, garantía",
    "- saveMemory: guardar información que aprendas del cliente",
    "",
    "IMPORTANTE: Siempre que aprendas algo del cliente, llama saveMemory para actualizar la memoria."
  ].join("\n");
}

/* ──────────────────────────────────────────────
   TOOL HANDLER FACTORY
   ────────────────────────────────────────────── */

function createToolHandlers(customerPhone) {
  const pendingMemory = {};

  async function flushMemory() {
    if (Object.keys(pendingMemory).length === 0) return;
    const existing = await getCustomerMemory(customerPhone);
    const merged = { ...(existing || getDefaultMemory(customerPhone, "")), ...pendingMemory };
    merged.last_seen_at = new Date().toISOString();
    await saveCustomerMemory(customerPhone, merged);
    const saved = { ...pendingMemory };
    pendingMemory.vehicle = undefined;
    pendingMemory.vehicle_year = undefined;
    pendingMemory.selected_product = undefined;
    pendingMemory.conversation_stage = undefined;
    return saved;
  }

  return {

    vehicleLookup: async (args) => {
      const result = detectVehicleInfo(args.message);
      if (result) {
        pendingMemory.vehicle = result.model;
        pendingMemory.vehicle_year = result.year;
        pendingMemory.bulb_low = result.lowBeam;
        pendingMemory.bulb_high = result.highBeam;
        pendingMemory.bulb_type = result.type;
        pendingMemory.conversation_stage = "vehicle_identified";
        return result;
      }
      return { notFound: true, message: "Vehículo no encontrado en DB local. Intenta con webVehicleLookup." };
    },

    webVehicleLookup: async (args) => {
      const year = (args.message.match(/\b(19|20)\d{2}\b/) || [])[0] || null;
      const result = await webVehicleLookup({ message: args.message, year });
      if (result) {
        pendingMemory.vehicle = result.model;
        pendingMemory.vehicle_year = result.year;
        pendingMemory.bulb_low = result.lowBeam;
        pendingMemory.bulb_high = result.highBeam;
        pendingMemory.bulb_type = result.type;
        pendingMemory.conversation_stage = "vehicle_identified";
        return result;
      }
      return { notFound: true, message: "No se encontró información del vehículo en internet." };
    },

    productLookup: async (args) => {
      const existing = await getCustomerMemory(customerPhone);
      const vehicle = existing ? { lowBeam: existing.bulb_low, highBeam: existing.bulb_high } : {};
      const intent = { product: args.product, price: args.product === "COB_2_CARAS" ? 250 : args.product === "COB_4_CARAS" ? 350 : 500 };

      pendingMemory.selected_product = args.product;
      pendingMemory.conversation_stage = "product_selected";
      if (existing) pendingMemory.lead_score = (existing.lead_score || 0) + 25;

      const reply = buildProductReply(intent, vehicle);
      return { reply, product: args.product, price: intent.price };
    },

    objectionHandler: async (args) => {
      const reply = buildObjectionReply(args.objectionType);
      return { reply };
    },

    getDeliveryInfo: async () => {
      return {
        deliveryPoints: ["Portales", "Juventud 2000", "Costco", "Soriana Anáhuac", "Smart & Final", "Plaza Mandarin"],
        homeDeliveryFee: 100,
        installationFee: 100,
        phone: "686 471 9077"
      };
    },

    getBusinessInfo: async () => {
      return {
        address: "De La Torre LED Shop, Mexicali",
        phone: "686 471 9077",
        schedule: "Lunes a sábado",
        warranty: "3 meses COB, 6 meses CSP Premium"
      };
    },

    saveMemory: async (args) => {
      if (args.vehicle) pendingMemory.vehicle = args.vehicle;
      if (args.vehicle_year) pendingMemory.vehicle_year = args.vehicle_year;
      if (args.selected_product) pendingMemory.selected_product = args.selected_product;
      if (args.conversation_stage) pendingMemory.conversation_stage = args.conversation_stage;
      return { saved: true };
    }
  };
}

/* ──────────────────────────────────────────────
   GPT CALLER WITH TOOL LOOP
   ────────────────────────────────────────────── */

async function callGPTWithTools(messages, handlers, maxCalls = 3) {
  const msgs = [...messages];
  let callCount = 0;

  while (callCount < maxCalls) {
    const response = await fetch(config.openai.baseUrl + "/chat/completions", {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        Authorization: "Bearer " + config.openai.apiKey
      },
      body: JSON.stringify({
        model: config.openai.model || "gpt-4.1-mini",
        messages: msgs,
        tools: TOOL_DEFS.map(t => ({
          type: "function",
          function: { name: t.name, description: t.description, parameters: t.parameters }
        })),
        tool_choice: "auto",
        temperature: 0.7,
        max_tokens: 500
      }),
      signal: AbortSignal.timeout(15000)
    });

    if (!response.ok) {
      const errText = await response.text().catch(() => "unknown");
      console.error("GPT API error:", response.status, errText.slice(0, 200));
      return null;
    }

    const data = await response.json();
    const choice = data.choices?.[0];
    if (!choice) return null;

    const msg = choice.message;
    msgs.push(msg);

    if (!msg.tool_calls || msg.tool_calls.length === 0) {
      const content = msg.content || "";
      if (typeof handlers?.flushMemory === "function") await handlers.flushMemory();
      return content;
    }

    for (const call of msg.tool_calls) {
      const handler = handlers[call.function.name];
      if (!handler) {
        msgs.push({ role: "tool", tool_call_id: call.id, content: JSON.stringify({ error: "Unknown tool" }) });
        continue;
      }
      try {
        const args = JSON.parse(call.function.arguments);
        const result = await handler(args);
        msgs.push({ role: "tool", tool_call_id: call.id, content: JSON.stringify(result) });
      } catch (err) {
        msgs.push({ role: "tool", tool_call_id: call.id, content: JSON.stringify({ error: err.message }) });
      }
    }

    callCount++;
  }

  if (typeof handlers?.flushMemory === "function") await handlers.flushMemory();
  const last = msgs[msgs.length - 1];
  return last.content || null;
}

/* ──────────────────────────────────────────────
   QUICK BYPASS — sales pipeline without GPT
   ────────────────────────────────────────────── */

async function tryQuickBypass(message, lower, memory, customerPhone, customerName) {

  // /clear command
  if (message === "/clear") {
    memory.vehicle = null;
    memory.vehicle_year = null;
    memory.bulb_low = null;
    memory.bulb_high = null;
    memory.bulb_type = null;
    memory.selected_product = null;
    memory.conversation_stage = "new";
    memory.lead_score = 0;
    await saveCustomerMemory(customerPhone, memory);
    return "Memoria limpiada.";
  }

  // ── COMPLETED stage ──

  if (memory.conversation_stage === "completed") {
    if (lower.includes("gracias") || lower === "thanks" || lower === "thank you") {
      return "A usted.";
    }
    return "Gracias por su compra. Si necesita algo mas, estoy aqui.";
  }

  // ── AFFIRMATIVE after product selected ──

  if (memory.selected_product && (lower === "si" || lower === "sí" || lower === "yes" || lower.startsWith("si ") || lower.startsWith("sí "))) {

    if (memory.conversation_stage === "product_selected") {
      memory.conversation_stage = "asked_install_delivery";
      await saveCustomerMemory(customerPhone, memory);
      return "Perfecto. " + memory.selected_product + ". Desea instalacion, punto medio o entrega a domicilio?";
    }

    if (memory.conversation_stage === "asked_schedule") {
      memory.conversation_stage = "completed";
      await saveCustomerMemory(customerPhone, memory);
      const prodName = memory.selected_product || "N/A";
      const prodPrice = { COB_2_CARAS: "$250", COB_4_CARAS: "$350", CSP_PREMIUM: "$500" }[memory.selected_product] || "";
      await notifyAdmin("Nuevo Lead - Cita Confirmada", [
        "Cliente: " + (customerName || memory.customer_name || "No especificado"),
        "Telefono: " + customerPhone,
        "Vehiculo: " + (memory.vehicle || "No especificado"),
        "Producto: " + prodName + (prodPrice ? " (" + prodPrice + " MXN)" : ""),
        "Estatus: Pendiente de confirmar lugar y hora"
      ]);
      return "En un momento recibira una llamada para confirmar lugar y hora de entrega.";
    }

    if (memory.conversation_stage === "asked_install_delivery") {
      return "Por favor especifique: instalacion, punto medio, o entrega a domicilio.";
    }
  }

  // ── NEGATIVE after product selected ──

  if (memory.selected_product && (lower === "no" || lower.startsWith("no ") || lower.includes("no gracias") || lower.includes("no quiero"))) {
    memory.selected_product = null;
    memory.conversation_stage = "vehicle_identified";
    await saveCustomerMemory(customerPhone, memory);
    return "Entendido. Si necesita algo mas, estoy aqui.";
  }

  // ── INSTALLATION after product selected ──

  if (memory.selected_product && (lower.includes("instalacion") || lower.includes("instalación"))) {
    memory.conversation_stage = "asked_schedule";
    await saveCustomerMemory(customerPhone, memory);
    return "Instalacion: +$100 MXN. Desea agendar hoy?";
  }

  // ── MEETING POINT after product selected ──

  if (memory.selected_product && lower.includes("punto medio")) {
    memory.conversation_stage = "completed";
    await saveCustomerMemory(customerPhone, memory);
    const prodName = memory.selected_product || "N/A";
    const prodPrice = { COB_2_CARAS: "$250", COB_4_CARAS: "$350", CSP_PREMIUM: "$500" }[memory.selected_product] || "";
    await notifyAdmin("Nuevo Lead - Punto Medio", [
      "Cliente: " + (customerName || memory.customer_name || "No especificado"),
      "Telefono: " + customerPhone,
      "Vehiculo: " + (memory.vehicle || "No especificado"),
      "Producto: " + prodName + (prodPrice ? " (" + prodPrice + " MXN)" : ""),
      "Estatus: Pendiente de confirmar lugar y hora"
    ]);
    return "En un momento recibira una llamada para confirmar lugar y hora de entrega.";
  }

  // ── DELIVERY after product selected ──

  if (memory.selected_product && (lower.includes("domicilio") || lower.includes("envio") || lower.includes("envío") || lower.includes("entrega"))) {
    memory.conversation_stage = "delivery_selected";
    await saveCustomerMemory(customerPhone, memory);
    return "Podemos entregar en Portales, Juventud 2000, Costco, o Plaza Mandarin. Cual le queda mejor?";
  }

  // ── DELIVERY_SELECTED stage ──

  if (memory.conversation_stage === "delivery_selected") {
    memory.conversation_stage = "completed";
    await saveCustomerMemory(customerPhone, memory);
    const prodName = memory.selected_product || "N/A";
    const prodPrice = { COB_2_CARAS: "$250", COB_4_CARAS: "$350", CSP_PREMIUM: "$500" }[memory.selected_product] || "";
    await notifyAdmin("Nuevo Lead - Domicilio", [
      "Cliente: " + (customerName || memory.customer_name || "No especificado"),
      "Telefono: " + customerPhone,
      "Vehiculo: " + (memory.vehicle || "No especificado"),
      "Producto: " + prodName + (prodPrice ? " (" + prodPrice + " MXN)" : ""),
      "Direccion: " + message,
      "Estatus: Pendiente de confirmar lugar y hora"
    ]);
    return "En un momento recibira una llamada para confirmar lugar y hora de entrega.";
  }

  // ── ASKED_SCHEDULE stage reprompt ──

  if (memory.conversation_stage === "asked_schedule") {
    return "Desea agendar hoy? Si o No.";
  }

  return null;
}

/* ──────────────────────────────────────────────
   FALLBACK — when GPT fails
   ────────────────────────────────────────────── */

function fallbackReply(memory) {
  if (memory.vehicle && memory.selected_product) {
    return "Seguimos con su pedido de " + memory.selected_product + ". Desea instalacion o entrega?";
  }
  if (memory.vehicle) {
    return "Seguimos con su " + memory.vehicle + ". Las opciones son COB 2 Caras $250, COB 4 Caras $350, CSP Premium $500. Cual le interesa?";
  }
  return getGreeting() + ". Cual es el año y modelo de su vehículo?";
}

/* ──────────────────────────────────────────────
   MAIN EXPORT
   ────────────────────────────────────────────── */

export async function generateBotReply({ customerPhone, customerName, customerMessage }) {
  const message = customerMessage.trim();
  const lower = message.toLowerCase();

  let memory = await getCustomerMemory(customerPhone);
  if (!memory) memory = getDefaultMemory(customerPhone, customerName);

  memory.last_seen_at = new Date().toISOString();

  // 1. Quick bypass (sales pipeline, no GPT)
  const bypassReply = await tryQuickBypass(message, lower, memory, customerPhone, customerName);
  if (bypassReply) {
    return bypassReply;
  }

  // 2. GPT + tools (skip if no API key)
  let reply = null;
  if (config.openai.apiKey) {
    const history = await getConversationHistory(customerPhone, 10);
    const systemPrompt = buildSystemPrompt({ history, memory, customerName });
    const handlers = createToolHandlers(customerPhone);

    reply = await callGPTWithTools(
      [{ role: "system", content: systemPrompt }, { role: "user", content: message }],
      handlers
    );
  }

  // 3. Fallback — detect vehicle & product without GPT
  if (!reply) {
    if (!memory.vehicle) {
      const vehicle = detectVehicleInfo(message);
      if (vehicle) {
        memory.vehicle = vehicle.model;
        memory.vehicle_year = vehicle.year;
        memory.bulb_low = vehicle.lowBeam;
        memory.bulb_high = vehicle.highBeam;
        memory.bulb_type = vehicle.type;
        memory.conversation_stage = "vehicle_identified";
        await saveCustomerMemory(customerPhone, memory);
      } else {
        const year = (message.match(/\b(19|20)\d{2}\b/) || [])[0] || null;
        if (year) {
          const webResult = await webVehicleLookup({ message, year });
          if (webResult) {
            memory.vehicle = webResult.model;
            memory.vehicle_year = webResult.year;
            memory.bulb_low = webResult.lowBeam;
            memory.bulb_high = webResult.highBeam;
            memory.bulb_type = webResult.type;
            memory.conversation_stage = "vehicle_identified";
            await saveCustomerMemory(customerPhone, memory);
          }
        }
      }
    }

    if (memory.vehicle && !memory.selected_product) {
      const intent = detectProductIntent(message);
      if (intent) {
        memory.selected_product = intent.product;
        memory.conversation_stage = "product_selected";
        memory.lead_score = (memory.lead_score || 0) + 25;
        await saveCustomerMemory(customerPhone, memory);
        reply = buildProductReply(intent, { lowBeam: memory.bulb_low, highBeam: memory.bulb_high });
      }
    }

    if (!reply) {
      reply = fallbackReply(memory);
    }
  }

  // 4. Save conversation history
  const msgsToSave = [
    { phone: customerPhone, role: "customer", message },
    { phone: customerPhone, role: "bot", message: reply }
  ];
  saveConversationMessages(msgsToSave).catch(() => {});

  return reply;
}