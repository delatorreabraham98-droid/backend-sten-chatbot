import express from "express";
import { config } from "../config.js";
import { createEntity, listEntity } from "../services/base44Client.js";

export const adminRouter = express.Router();

adminRouter.post("/admin/bootstrap", async (_req, res) => {
  try {
    const phoneNumberId = config.meta.phoneNumberId;
    if (!phoneNumberId) {
      return res.status(400).json({ error: "META_PHONE_NUMBER_ID is not configured" });
    }

    const existingChannel = await listEntity("Channel", {
      q: { phone_number_id: phoneNumberId, type: "whatsapp", status: "active" },
      limit: 1
    });

    if (existingChannel[0]) {
      return res.json({
        message: "Channel already exists",
        channel: existingChannel[0]
      });
    }

    const existingClients = await listEntity("Client", { q: { active: true }, limit: 1 });
    let client = existingClients[0];

    if (!client) {
      client = await createEntity("Client", {
        name: config.bot.businessName,
        active: true,
        timezone: config.bot.timezone
      });
    }

    const existingBots = await listEntity("Bot", {
      q: { client_id: client.id, active: true },
      limit: 1
    });

    let bot = existingBots[0];

    if (!bot) {
      bot = await createEntity("Bot", {
        name: `${config.bot.businessName} Bot`,
        client_id: client.id,
        active: true,
        business_name: config.bot.businessName,
        timezone: config.bot.timezone
      });
    }

    const channel = await createEntity("Channel", {
      type: "whatsapp",
      phone_number_id: phoneNumberId,
      status: "active",
      client_id: client.id,
      bot_id: bot.id
    });

    res.status(201).json({
      message: "Bootstrap complete",
      client,
      bot,
      channel
    });
  } catch (error) {
    console.error("Bootstrap failed", error);
    res.status(500).json({ error: error.message });
  }
});
