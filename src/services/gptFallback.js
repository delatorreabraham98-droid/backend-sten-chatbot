import { config } from "../config.js";

const SYSTEM_PROMPT = [
  "Eres un asistente de ventas de focos LED para autos en Mexicali, México.",
  "Nombre del negocio: La Torre LED Shop.",
  "",
  "Debes clasificar el mensaje del cliente en UNA de estas categorías y responder adecuadamente.",
  "",
  "Categorías:",
  "",
  "1. PREGUNTA_GARANTIA -> Todas nuestras luces tienen garantia real",
  "",
  "2. PREGUNTA_HORARIO -> Atendemos de lunes a sabado, consulta nuestro horario en redes",
  "",
  "3. PREGUNTA_DIRECCION -> Dar direccion y telefono",
  "",
  "4. PREGUNTA_ENTREGA -> Mostrar puntos de entrega: Portales, Juventud 2000, Costco, Soriana Anahuac, Smart & Final, Plaza Mandarin",
  "",
  "5. CONFIRMACION_COMPRA (si, quiero, adelante, dale) cuando ya hay producto seleccionado -> preguntar si desea instalacion o entrega",
  "",
  "6. PREGUNTA_PRECIOS -> Mostrar los 3 productos con precios: COB 2 Caras $250, COB 4 Caras $350, CSP Premium $500",
  "",
  "7. SALUDO (hola, buenos dias, buenas tardes) -> Saludar y preguntar el ano y modelo del vehiculo",
  "",
  "8. IRRELEVANTE -> null",
  "",
  "9. NO_ESTA_SEGURO -> null",
  "",
  "Responde SOLO con un JSON en este formato:",
  '{ "category": "CATEGORIA", "reply": "texto de respuesta" }',
  "Si la categoria es IRRELEVANTE o NO_ESTA_SEGURO, reply debe ser null."
].join("\n");

export async function gptFallback({ message, memory }) {
  if (!config.openai.apiKey) return null;

  const vehicleContext = memory?.vehicle
    ? `Vehículo: ${memory.vehicle}${memory.vehicle_year ? " " + memory.vehicle_year : ""}`
    : "Sin vehículo";
  const productContext = memory?.selected_product
    ? `Producto seleccionado: ${memory.selected_product}`
    : "Sin producto";
  const stageContext = `Etapa: ${memory?.conversation_stage || "new"}`;
  const userPrompt = [
    "Contexto del cliente:",
    vehicleContext,
    productContext,
    stageContext,
    "",
    `Mensaje del cliente: "${message}"`
  ].join("\n");

  try {
    const response = await fetch("https://api.openai.com/v1/chat/completions", {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        Authorization: `Bearer ${config.openai.apiKey}`
      },
      body: JSON.stringify({
        model: config.openai.model,
        messages: [
          { role: "system", content: SYSTEM_PROMPT },
          { role: "user", content: userPrompt }
        ],
        temperature: 0.1,
        max_tokens: 300
      }),
      signal: AbortSignal.timeout(10000)
    });

    if (!response.ok) {
      console.error("GPT API error:", response.status);
      return null;
    }

    const data = await response.json();
    const content = data.choices?.[0]?.message?.content;
    if (!content) return null;

    let parsed;
    try {
      parsed = JSON.parse(content);
    } catch {
      const match = content.match(/\{[\s\S]*\}/);
      if (match) {
        try { parsed = JSON.parse(match[0]); } catch { return null; }
      } else {
        return null;
      }
    }

    if (parsed.category === "IRRELEVANTE" || parsed.category === "NO_ESTA_SEGURO" || !parsed.reply) {
      return null;
    }

    return { intent: parsed.category, reply: parsed.reply };
  } catch (error) {
    if (error.name !== "AbortError") {
      console.error("gptFallback error:", error.message);
    }
    return null;
  }
}
