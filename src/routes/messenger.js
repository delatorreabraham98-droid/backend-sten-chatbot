import express from "express";
import { config } from "../config.js";
import { generateBotReply } from "../services/aiResponder.js";
import {
  createConversationMessage,
  createLeadIfCommercialIntent,
  findOrCreateConversation,
  getRuntimeContextForMessenger
} from "../services/base44DataStore.js";
import { sendMessengerTextMessage } from "../services/metaWhatsApp.js";
import { extractMessengerMessages } from "../services/messengerWebhookParser.js";

export const messengerRouter = express.Router();

messengerRouter.get("/webhook/messenger", (req, res) => {
  const mode = req.query["hub.mode"];
  const token = req.query["hub.verify_token"];
  const challenge = req.query["hub.challenge"];

  if (mode === "subscribe" && token === config.messenger.verifyToken) {
    return res.status(200).send(challenge);
  }

  return res.sendStatus(403);
});

messengerRouter.post("/webhook/messenger", async (req, res) => {
  res.sendStatus(200);

  const inboundMessages = extractMessengerMessages(req.body);
  if (inboundMessages.length === 0) return;

  for (const message of inboundMessages) {
    try {
      const runtimeContext = await getRuntimeContextForMessenger({
        pageId: message.pageId
      });

      const conversation = await findOrCreateConversation({
        channel: runtimeContext.channel,
        message,
        channelType: "messenger"
      });

      await createConversationMessage({
        conversation,
        channel: runtimeContext.channel,
        direction: "inbound",
        senderType: "customer",
        messageText: message.text,
        rawPayload: message.raw
      });

      const reply = await generateBotReply({
        customerPhone: message.from,
        customerName: message.customerName,
        customerMessage: message.text
      });

      const metaResponse = await sendMessengerTextMessage({
        recipientId: message.from,
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

      console.log("Messenger message processed", {
        messageId: message.messageId,
        from: message.from
      });
    } catch (error) {
      console.error("Failed to process Messenger message", {
        messageId: message.messageId,
        error: error.message
      });
    }
  }
});
