import { createClient } from "@supabase/supabase-js";
import { normalize } from "../utils/normalize.js";

function getClient() {
  const url = process.env.SUPABASE_URL;
  const key = process.env.SUPABASE_SERVICE_ROLE_KEY;
  if (!url || !key) return null;
  return createClient(url, key);
}

const supabase = getClient();

let cache = null;
let cacheLoaded = false;

function getWords(text) {
  return normalize(text).split(/\s+/).filter(Boolean);
}

export async function loadLearnedExpressions() {
  if (!supabase) { cacheLoaded = true; cache = []; return; }
  if (cacheLoaded) return;

  const { data, error } = await supabase.from("learned_expressions").select("*");
  if (error) {
    console.error("loadLearnedExpressions error:", error);
    cache = [];
    cacheLoaded = true;
    return;
  }

  cache = (data || []).map(entry => ({
    ...entry,
    normalized: normalize(entry.expression),
    words: getWords(entry.expression)
  }));
  cacheLoaded = true;
}

export function matchLearnedExpression(message) {
  if (!cache || cache.length === 0) return null;

  const msgWords = getWords(message);
  if (msgWords.length === 0) return null;

  let best = null;
  let bestScore = 0;

  for (const entry of cache) {
    const union = new Set([...msgWords, ...entry.words]);
    const intersection = msgWords.filter(w => entry.words.includes(w));
    const score = intersection.length / union.size;

    if (score > bestScore) {
      bestScore = score;
      best = entry;
    }
  }

  return bestScore >= 0.7
    ? { intent: best.detected_intent, expression: best.expression }
    : null;
}

export async function saveLearnedExpression({ expression, detectedIntent }) {
  if (!supabase) return;

  const { error } = await supabase.from("learned_expressions").upsert({
    expression,
    detected_intent: detectedIntent
  }, { onConflict: "expression" });

  if (error) {
    console.error("saveLearnedExpression error:", error);
    return;
  }

  if (cache) {
    cache.push({
      expression,
      detected_intent: detectedIntent,
      normalized: normalize(expression),
      words: getWords(expression)
    });
  }
}

loadLearnedExpressions().catch(() => {});
