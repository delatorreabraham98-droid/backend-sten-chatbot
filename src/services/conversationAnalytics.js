import { createClient } from "@supabase/supabase-js";

function getClient() {
  const url = process.env.SUPABASE_URL;
  const key = process.env.SUPABASE_SERVICE_ROLE_KEY;
  if (!url || !key) return null;
  return createClient(url, key);
}

const supabase = getClient();

export async function logConversationAnalytics({ phone, message, reply, detectedIntent, detectedObjection }) {
  if (!supabase) return;

  const isFallback = reply?.includes("¿Cuál es el año y modelo") || false;

  const { error } = await supabase.from("conversation_analytics").insert({
    phone,
    message,
    detected_intent: detectedIntent || (isFallback ? "unknown" : "handled"),
    detected_objection: detectedObjection || null
  });

  if (error) {
    console.error("logConversationAnalytics error:", error);
  }
}
