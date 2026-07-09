import { config } from "../config.js";
import { createEntity, listEntity, updateEntity } from "./base44Client.js";

export async function getChannelByPhoneNumber({ phoneNumberId }) {
  const channels = await listEntity("Channel", {
    q: {
      type: "whatsapp",
      phone_number_id: phoneNumberId,
      status: "active"
    },
    limit: 1
  });

  let channel = channels[0];

  if (!channel) {
    const fallbackChannels = await listEntity("Channel", {
      q: {
        type: "whatsapp",
        status: "active"
      },
      limit: 1
    });

    channel = fallbackChannels[0];
  }

  if (!channel) {
    throw new Error(
      `No active WhatsApp channel found for phone_number_id ${phoneNumberId}. ` +
      `Create a Channel record in Base44 with phone_number_id="${phoneNumberId}", type="whatsapp", status="active", ` +
      `and ensure it links to an existing Client and Bot record.`
    );
  }

  const [client, bot, knowledgeItems] = await Promise.all([
    listEntity("Client", { q: { id: channel.client_id }, limit: 1 }),
    listEntity("Bot", { q: { id: channel.bot_id }, limit: 1 }),
    listEntity("KnowledgeItem", {
      q: { client_id: channel.client_id, active: true },
      limit: 20,
      sortBy: "-updated_date"
    })
  ]);

  const botRecord = bot[0];

  return {
    channel,
    client: client[0] || null,
    bot: botRecord,
    botActive: botRecord?.active === true,
    knowledgeItems
  };
}

export async function getRuntimeContextForMessenger({ pageId }) {
  const channels = await listEntity("Channel", {
    q: {
      type: "messenger",
      page_id: pageId,
      status: "active"
    },
    limit: 1
  });

  let channel = channels[0];

  if (!channel) {
    const fallbackChannels = await listEntity("Channel", {
      q: { type: "messenger", status: "active" },
      limit: 1
    });
    channel = fallbackChannels[0];
  }

  if (!channel) {
    throw new Error(
      `No active Messenger channel found for page_id ${pageId}. ` +
      `Create a Channel record in Base44 with page_id="${pageId}", type="messenger", status="active".`
    );
  }

  const [client, bot, knowledgeItems] = await Promise.all([
    listEntity("Client", { q: { id: channel.client_id }, limit: 1 }),
    listEntity("Bot", { q: { id: channel.bot_id }, limit: 1 }),
    listEntity("KnowledgeItem", {
      q: { client_id: channel.client_id, active: true },
      limit: 20,
      sortBy: "-updated_date"
    })
  ]);

  const botRecord = bot[0];

  return {
    channel,
    client: client[0] || null,
    bot: botRecord,
    botActive: botRecord?.active === true,
    knowledgeItems
  };
}

export async function findOrCreateConversation({ channel, message, channelType, botActive = true }) {
  const existing = await listEntity("Conversation", {
    q: {
      channel_id: channel.id,
      external_user_id: message.from
    },
    limit: 1,
    sortBy: "-updated_date"
  });

  const now = new Date().toISOString();
  const currentStatus = existing[0]?.status;

  console.log("findOrCreateConversation debug", {
    channelId: channel.id,
    externalUserId: message.from,
    foundExisting: !!existing[0],
    currentStatus,
    botActive
  });

  let status;

  const humanModeActive = currentStatus === "needs_human" || !botActive;

  if (currentStatus === "needs_human") {
    status = "needs_human";
  } else if (botActive) {
    status = "bot_active";
  } else {
    status = "needs_human";
  }

  const type = channelType || channel.type || "whatsapp";
  const customerName = message.customerName || (type === "messenger" ? "Cliente Messenger" : "Cliente WhatsApp");

  let conversation;

  if (existing[0]) {
    conversation = await updateEntity("Conversation", existing[0].id, {
      status,
      last_message_at: now,
      last_message_preview: trimPreview(message.text),
      message_count: Number(existing[0].message_count || 0) + 1
    });
  } else {
    conversation = await createEntity("Conversation", {
      client_id: channel.client_id,
      channel_id: channel.id,
      external_user_id: message.from,
      customer_name: customerName,
      customer_phone: type === "whatsapp" ? message.from : "",
      channel_type: type,
      status,
      last_message_at: now,
      last_message_preview: trimPreview(message.text),
      message_count: 1
    });
  }

  return { conversation, humanModeActive };
}

export async function updateConversationStatus(conversationId, status) {
  return updateEntity("Conversation", conversationId, { status });
}

export async function getConversationHistory(conversationId, limit = 10) {
  return listEntity("Message", {
    q: { conversation_id: conversationId },
    limit,
    sortBy: "created_date"
  });
}

export async function createConversationMessage({
  conversation,
  channel,
  direction,
  senderType,
  messageText,
  messageType = "text",
  status = "sent",
  rawPayload
}) {
  const data = {
    conversation_id: conversation.id,
    direction,
    sender_type: senderType,
    message_text: messageText,
    message_type: messageType,
    status,
    raw_payload: rawPayload ? JSON.stringify(rawPayload) : ""
  };

  if (config.base44.includeClientIdOnMessages) {
    data.client_id = channel.client_id;
  }

  return createEntity("Message", data);
}

export async function createLeadIfCommercialIntent({ conversation, channel, message, reply }) {
  if (!hasCommercialIntent(message.text)) return null;

  const existing = await listEntity("Lead", {
    q: {
      client_id: channel.client_id,
      conversation_id: conversation.id,
      status: "new"
    },
    limit: 1
  });

  if (existing[0]) return existing[0];

  return createEntity("Lead", {
    client_id: channel.client_id,
    conversation_id: conversation.id,
    customer_name: message.customerName || "Cliente WhatsApp",
    phone: message.from,
    product_interest: extractProductInterest(message.text),
    status: "new",
    notes: `Lead detectado automaticamente por WhatsApp.\n\nCliente: ${message.text}\n\nBot: ${reply}`
  });
}

function hasCommercialIntent(text) {
  const normalized = text.toLowerCase();
  const keywords = [
    "precio", "cuanto", "cuanto cuesta", "cotizacion", "cotizar",
    "comprar", "instalacion", "instalar", "mayoreo", "disponible",
    "tienes", "ocupo", "necesito"
  ];
  return keywords.some((keyword) => normalized.includes(keyword));
}

function extractProductInterest(text) {
  return trimPreview(text, 120);
}

function trimPreview(text, maxLength = 140) {
  if (!text) return "";
  return text.length > maxLength ? `${text.slice(0, maxLength - 3)}...` : text;
}