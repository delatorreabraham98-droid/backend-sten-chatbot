export function extractWhatsAppMessages(payload) {
  const messages = [];

  for (const entry of payload?.entry || []) {
    for (const change of entry?.changes || []) {
      if (change?.field !== "messages") continue;

      const value = change.value || {};
      const contactsByWaId = new Map(
        (value.contacts || []).map((contact) => [
          contact.wa_id,
          contact.profile?.name || ""
        ])
      );

      for (const message of value.messages || []) {
        if (message.type === "text") {
          messages.push({
            from: message.from,
            messageId: message.id,
            text: message.text?.body || "",
            timestamp: message.timestamp,
            customerName: contactsByWaId.get(message.from) || "",
            phoneNumberId: value.metadata?.phone_number_id || "",
            messageType: "text",
            raw: message
          });
        } else if (message.type === "audio") {
          const audio = message.audio || {};
          messages.push({
            from: message.from,
            messageId: message.id,
            text: "",
            timestamp: message.timestamp,
            customerName: contactsByWaId.get(message.from) || "",
            phoneNumberId: value.metadata?.phone_number_id || "",
            messageType: "audio",
            mediaId: audio.id || audio.media_id || null,
            mimeType: audio.mime_type || "audio/ogg",
            raw: message
          });
        }
      }
    }
  }

  return messages;
}
