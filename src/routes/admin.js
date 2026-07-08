import express from "express";
import { listEntity, updateEntity } from "../services/base44Client.js";
import { sendWhatsAppTextMessage } from "../services/metaWhatsApp.js";
import {
  createConversationMessage,
  updateConversationStatus
} from "../services/base44DataStore.js";

export const adminRouter = express.Router();

adminRouter.post("/api/send-manual-reply", async (req, res) => {
  const { conversationId, messageText, channelPhoneNumberId, customerPhone } = req.body;

  if (!conversationId || !messageText || !customerPhone) {
    return res.status(400).json({ error: "Faltan campos requeridos: conversationId, messageText, customerPhone" });
  }

  try {
    const conversations = await listEntity("Conversation", {
      q: { id: conversationId },
      limit: 1
    });

    const conversation = conversations[0];
    if (!conversation) {
      return res.status(404).json({ error: "Conversacion no encontrada" });
    }

    const messagePayload = await sendWhatsAppTextMessage({
      to: customerPhone,
      body: messageText
    });

    await createConversationMessage({
      conversation,
      channel: { id: conversation.channel_id },
      direction: "outbound",
      senderType: "agent",
      messageText,
      rawPayload: messagePayload
    });

    await updateConversationStatus(conversation.id, "waiting_human");

    console.log("Manual reply sent", {
      conversationId,
      to: customerPhone
    });

    res.json({ success: true });
  } catch (error) {
    console.error("Failed to send manual reply", { conversationId, error: error.message });
    res.status(500).json({ error: error.message });
  }
});

adminRouter.get("/api/bots", async (_req, res) => {
  try {
    const bots = await listEntity("Bot", { limit: 100 });
    res.json({ bots });
  } catch (error) {
    console.error("Failed to list bots", { error: error.message });
    res.status(500).json({ error: error.message });
  }
});

adminRouter.post("/api/bots/:id/toggle", async (req, res) => {
  const { id } = req.params;
  const { active } = req.body;

  if (typeof active !== "boolean") {
    return res.status(400).json({ error: "active debe ser boolean" });
  }

  try {
    const updated = await updateEntity("Bot", id, { active });
    res.json({ success: true, bot: updated });
  } catch (error) {
    console.error("Failed to toggle bot", { botId: id, error: error.message });
    res.status(500).json({ error: error.message });
  }
});

adminRouter.get("/api/conversations", async (req, res) => {
  const { status, channel_id, limit = 50 } = req.query;
  const query = {};

  if (status) query.status = status;
  if (channel_id) query.channel_id = channel_id;

  try {
    const conversations = await listEntity("Conversation", { q: query, limit: Number(limit), sortBy: "-last_message_at" });
    res.json({ conversations });
  } catch (error) {
    console.error("Failed to list conversations", { error: error.message });
    res.status(500).json({ error: error.message });
  }
});

adminRouter.get("/api/conversations/:id/messages", async (req, res) => {
  const { id } = req.params;

  try {
    const messages = await listEntity("Message", {
      q: { conversation_id: id },
      limit: 100,
      sortBy: "created_date"
    });

    res.json({ messages });
  } catch (error) {
    console.error("Failed to get messages", { conversationId: id, error: error.message });
    res.status(500).json({ error: error.message });
  }
});