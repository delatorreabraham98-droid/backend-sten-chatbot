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

export async function sendMessengerTextMessage({ recipientId, body }) {
  if (!config.messenger.pageAccessToken) {
    throw new Error("Missing Messenger Page Access Token");
  }

  const response = await fetch(
    `https://graph.facebook.com/${graphApiVersion}/me/messages?access_token=${config.messenger.pageAccessToken}`,
    {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        recipient: { id: recipientId },
        message: { text: body }
      })
    }
  );

  const payload = await response.json().catch(() => ({}));

  if (!response.ok) {
    const detail = payload?.error?.message || "Meta rejected the message";
    console.error("Messenger API error", { message: detail, full: payload });
    throw new Error(detail);
  }

  return payload;
}

/*
 * ========= Audio utilities =========
 */

export async function downloadMediaFromMeta(mediaId) {
  const infoRes = await fetch(
    `https://graph.facebook.com/${graphApiVersion}/${mediaId}`,
    { headers: { Authorization: `Bearer ${config.meta.accessToken}` } }
  );
  if (!infoRes.ok) {
    const err = await infoRes.json().catch(() => ({}));
    throw new Error(err?.error?.message || `Failed to get media info (${infoRes.status})`);
  }
  const info = await infoRes.json();
  if (!info.url) throw new Error("No download URL in media info");

  const dlRes = await fetch(info.url, {
    headers: { Authorization: `Bearer ${config.meta.accessToken}` },
    signal: AbortSignal.timeout(30_000)
  });
  if (!dlRes.ok) throw new Error(`Failed to download media (${dlRes.status})`);

  const buffer = await dlRes.arrayBuffer();
  return { data: new Uint8Array(buffer), mimeType: info.mime_type || "audio/ogg" };
}

export async function transcribeAudio(audioData, mimeType) {
  if (!config.openai.apiKey) throw new Error("Missing OpenAI API key");

  const ext = mimeType?.includes("mp4") ? "m4a" : "ogg";
  const blob = new Blob([audioData], { type: mimeType || "audio/ogg" });
  const form = new FormData();
  form.append("file", blob, `audio.${ext}`);
  form.append("model", "whisper-1");
  form.append("response_format", "text");

  const res = await fetch("https://api.openai.com/v1/audio/transcriptions", {
    method: "POST",
    headers: { Authorization: `Bearer ${config.openai.apiKey}` },
    body: form,
    signal: AbortSignal.timeout(30_000)
  });

  if (!res.ok) {
    const err = await res.text().catch(() => "unknown");
    throw new Error(`Whisper transcription failed: ${err}`);
  }

  return (await res.text()).trim();
}

export async function textToSpeech(text) {
  if (!config.openai.apiKey) throw new Error("Missing OpenAI API key");

  const res = await fetch("https://api.openai.com/v1/audio/speech", {
    method: "POST",
    headers: {
      Authorization: `Bearer ${config.openai.apiKey}`,
      "Content-Type": "application/json"
    },
    body: JSON.stringify({
      model: "tts-1",
      voice: "alloy",
      input: text,
      response_format: "opus"
    }),
    signal: AbortSignal.timeout(30_000)
  });

  if (!res.ok) {
    const err = await res.text().catch(() => "unknown");
    throw new Error(`TTS failed: ${err}`);
  }

  const buffer = await res.arrayBuffer();
  return new Uint8Array(buffer);
}

export async function uploadMediaToMeta(audioData, mimeType = "audio/ogg") {
  if (!config.meta.accessToken || !config.meta.phoneNumberId) {
    throw new Error("Missing Meta WhatsApp configuration");
  }

  const ext = mimeType.includes("mp4") ? "m4a" : "ogg";
  const blob = new Blob([audioData], { type: mimeType });
  const form = new FormData();
  form.append("messaging_product", "whatsapp");
  form.append("file", blob, `response.${ext}`);
  form.append("type", mimeType);

  const res = await fetch(
    `https://graph.facebook.com/${graphApiVersion}/${config.meta.phoneNumberId}/media`,
    {
      method: "POST",
      headers: { Authorization: `Bearer ${config.meta.accessToken}` },
      body: form,
      signal: AbortSignal.timeout(30_000)
    }
  );

  if (!res.ok) {
    const err = await res.json().catch(() => ({}));
    throw new Error(err?.error?.message || "Failed to upload media to Meta");
  }

  const data = await res.json();
  return data.id;
}

export async function sendWhatsAppAudioMessage({ to, mediaId }) {
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
        type: "audio",
        audio: { id: mediaId }
      })
    }
  );

  const payload = await response.json().catch(() => ({}));

  if (!response.ok) {
    const detail = payload?.error?.message || "Meta rejected the audio message";
    console.error("Meta audio send error", { message: detail, full: payload });
    throw new Error(detail);
  }

  return payload;
}
