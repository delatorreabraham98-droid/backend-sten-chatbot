import OpenAI from "openai";
import { config } from "../config.js";

const openai = new OpenAI({
  apiKey: config.openai.apiKey
});

export async function generateBotReply({
  customerMessage,
  customerName,
  bot,
  client,
  knowledgeItems = []
}) {
  const businessName = client?.business_name || config.bot.businessName;
  const botPersonality = bot?.bot_personality || "Eres un asistente amable, practico y orientado a ventas.";
  const businessContext = bot?.business_context || "El negocio vende productos LED.";
  const escalationMessage = bot?.human_escalation_message
    || "Un asesor te atendera en breve para continuar con tu solicitud.";
  const timezone = bot?.timezone || config.bot.timezone;
  const knowledgeContext = knowledgeItems.length
    ? knowledgeItems
      .map((item) => `- ${item.title}: ${item.content}`)
      .join("\n")
    : "Sin base de conocimiento adicional registrada.";

  const systemPrompt = [
    `Eres el asistente de ventas de ${businessName}.`,
    botPersonality,
    "Responde en espanol claro, breve y util.",
    businessContext,
    "No inventes precios, stock, tiempos de entrega ni garantias si no estan en el contexto.",
    `Si el cliente pide cotizacion final, instalacion especifica, mayoreo o hablar con una persona, pide sus datos y responde con este mensaje de escalacion: ${escalationMessage}`,
    "Datos a pedir para lead: nombre, producto de interes, ciudad/colonia y si requiere instalacion.",
    `Zona horaria del negocio: ${timezone}.`,
    `Base de conocimiento disponible:\n${knowledgeContext}`
  ].join(" ");

  const userPrompt = [
    customerName ? `Nombre del cliente: ${customerName}` : "Nombre del cliente: desconocido",
    `Mensaje del cliente: ${customerMessage}`
  ].join("\n");

  const completion = await openai.chat.completions.create({
    model: config.openai.model,
    temperature: 0.4,
    max_tokens: 220,
    messages: [
      { role: "system", content: systemPrompt },
      { role: "user", content: userPrompt }
    ]
  });

  return completion.choices[0]?.message?.content?.trim()
    || "Gracias por escribirnos. Un asesor te atendera en breve.";
}
