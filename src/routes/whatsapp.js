import express from "express";
import { config } from "../config.js";
import { generateBotReply } from "../services/aiResponder.js";
import {
  createConversationMessage,
  createLeadIfCommercialIntent,
  findOrCreateConversation,
  getRuntimeContextForWhatsApp
} from "../services/base44DataStore.js";
import {
  sendWhatsAppTextMessage,
  sendWhatsAppAudioMessage,
  downloadMediaFromMeta,
  transcribeAudio,
  textToSpeech,
  uploadMediaToMeta
} from "../services/metaWhatsApp.js";
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

async function processAudioMessage(message) {
  console.log("Processing audio message", { messageId: message.messageId, from: message.from });

  const { data: audioData, mimeType } = await downloadMediaFromMeta(message.mediaId);

  const transcribedText = await transcribeAudio(audioData, mimeType);
  if (!transcribedText) throw new Error("Transcription returned empty text");

  console.log("Audio transcribed", { messageId: message.messageId, text: transcribedText.slice(0, 100) });

  return { transcribedText };
}

whatsappRouter.post("/webhook/whatsapp", async (req, res) => {
  res.sendStatus(200);

  const inboundMessages = extractWhatsAppMessages(req.body);
  if (inboundMessages.length === 0) return;

  for (const message of inboundMessages) {
    try {
      const runtimeContext = await getRuntimeContextForWhatsApp({
        phoneNumberId: message.phoneNumberId
      });

      // For audio messages, transcribe first
      let messageText = message.text;
      let messageType = message.messageType || "text";

      if (message.messageType === "audio") {
        const { transcribedText } = await processAudioMessage(message);
        messageText = transcribedText;
        message.text = transcribedText;
      }

      const conversation = await findOrCreateConversation({
        channel: runtimeContext.channel,
        message,
        channelType: "whatsapp"
      });

      await createConversationMessage({
        conversation,
        channel: runtimeContext.channel,
        direction: "inbound",
        senderType: "customer",
        messageText,
        messageType,
        rawPayload: message.raw
      });

      const reply = await generateBotReply({
        customerPhone: message.from,
        customerName: message.customerName,
        customerMessage: messageText
      });

      // Send response — audio if configured, otherwise text
      let responsePayload;

      if (config.respondWithAudio) {
        try {
          const audioData = await textToSpeech(reply);
          const mediaId = await uploadMediaToMeta(audioData);
          responsePayload = await sendWhatsAppAudioMessage({ to: message.from, mediaId });
        } catch (audioErr) {
          console.error("TTS/audio send failed, falling back to text", audioErr.message);
          responsePayload = await sendWhatsAppTextMessage({ to: message.from, body: reply });
        }
      } else {
        responsePayload = await sendWhatsAppTextMessage({ to: message.from, body: reply });
      }

      await createConversationMessage({
        conversation,
        channel: runtimeContext.channel,
        direction: "outbound",
        senderType: "bot",
        messageText: reply,
        messageType: config.respondWithAudio ? "audio" : "text",
        rawPayload: responsePayload
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
        phoneNumberId: message.phoneNumberId,
        messageType: message.messageType,
        respondedWithAudio: config.respondWithAudio
      });
    } catch (error) {
      console.error("Failed to process WhatsApp message", {
        messageId: message.messageId,
        error: error.message
      });
    }
  }
});
