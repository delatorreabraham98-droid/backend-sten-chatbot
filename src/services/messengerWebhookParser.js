export function extractMessengerMessages(payload) {
  const messages = [];

  for (const entry of payload?.entry || []) {
    for (const event of entry?.messaging || []) {
      if (!event.message?.text) continue;

      messages.push({
        from: event.sender?.id || "",
        messageId: event.message?.mid || "",
        text: event.message.text,
        timestamp: event.timestamp || "",
        customerName: "",
        pageId: event.recipient?.id || "",
        raw: event
      });
    }
  }

  return messages;
}
