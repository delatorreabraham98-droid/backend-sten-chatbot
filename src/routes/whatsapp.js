import express from "express";
import { config } from "../config.js";
import { generateBotReply } from "../services/aiResponder.js";
import {
  createConversationMessage,
  createLeadIfCommercialIntent,
  findOrCreateConversation,
  getChannelByPhoneNumber
} from "../services/base44DataStore.js";
import { sendWhatsAppTextMessage } from "../services/metaWhatsApp.js";
import { extractWhatsAppMessages } from "../services/whatsappWebhookParser.js";

export const whatsappRouter = express.Router();

whatsappRouter.get("/webhook/whatsapp", (req, res) => {
  const mode = req.query["hub.mode"];
  const token = req.query["hub.verify_token"];
  const challenge = req.query["hub.challenge"];

  if (mode === "subscribe" && token === config.meta.verifyToken) {
    return res.status(200).send(challenge);
  }

  return res.sendStatus(403);
});

async function processInboundMessage(message) {
  const runtimeContext = await getChannelByPhoneNumber({
    phoneNumberId: message.phoneNumberId
  });

  const conversation = await findOrCreateConversation({
    channel: runtimeContext.channel,
    message,
    botActive: runtimeContext.botActive
  });

  await createConversationMessage({
    conversation,
    channel: runtimeContext.channel,
    direction: "inbound",
    senderType: "customer",
    messageText: message.text,
    rawPayload: message.raw
  });

  const conversationStatus = conversation?.status || "bot_active";

  if (!runtimeContext.botActive || conversationStatus === "waiting_human") {
    console.log("Modo humano — mensaje guardado sin respuesta automatica", {
      messageId: message.messageId,
      from: message.from,
      conversationId: conversation.id,
      status: conversationStatus
    });
    return;
  }

  const reply = await generateBotReply({
    customerPhone: message.from,
    customerName: message.customerName,
    customerMessage: message.text
  });

  const metaResponse = await sendWhatsAppTextMessage({
    to: message.from,
    body: reply
  });

  await createConversationMessage({
    conversation,
    channel: runtimeContext.channel,
    direction: "outbound",
    senderType: "bot",
    messageText: reply,
    rawPayload: metaResponse
  });

  await createLeadIfCommercialIntent({
    conversation,
    channel: runtimeContext.channel,
    message,
    reply
  });

  console.log("WhatsApp message processed", {
    messageId: message.messageId,
    from: message.from,
    phoneNumberId: message.phoneNumberId
  });
}

whatsappRouter.post("/webhook/whatsapp", async (req, res) => {
  res.sendStatus(200);

  const inboundMessages = extractWhatsAppMessages(req.body);
  if (inboundMessages.length === 0) return;

  for (const message of inboundMessages) {
    processInboundMessage(message).catch((error) => {
      console.error("Failed to process WhatsApp message", {
        messageId: message.messageId,
        error: error.message
      });
    });
  }
});
