import { config } from "../config.js";

const graphApiVersion = "v25.0";

export async function sendWhatsAppTextMessage({ to, body }) {
  if (!config.meta.accessToken || !config.meta.phoneNumberId) {
    throw new Error("Missing Meta WhatsApp configuration");
  }

  const response = await fetch(
    `https://graph.facebook.com/${graphApiVersion}/${config.meta.phoneNumberId}/messages`,
    {
      method: "POST",
      headers: {
        Authorization: `Bearer ${config.meta.accessToken}`,
        "Content-Type": "application/json"
      },
      body: JSON.stringify({
        messaging_product: "whatsapp",
        recipient_type: "individual",
        to,
        type: "text",
        text: {
          preview_url: false,
          body
        }
      })
    }
  );

  const payload = await response.json().catch(() => ({}));

  if (!response.ok) {
    const detail = payload?.error?.message || "Meta rejected the message";
    const code = payload?.error?.code || response.status;
    console.error("Meta API error", { code, message: detail, full: payload });
    throw new Error(detail);
  }

  return payload;
}
