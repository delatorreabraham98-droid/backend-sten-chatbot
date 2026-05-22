const BULB_PATTERN = /\b(?:H\d{1,2}|9\d{3}|D[1-4][RS]|5202|88[01]|744[03]|194|921|912)\b/gi;

const cache = new Map();
const CACHE_TTL = 24 * 60 * 60 * 1000;

function extractBulbs(text) {
  if (!text) return [];
  const matches = text.match(BULB_PATTERN) || [];
  return [...new Set(matches.map(m => m.toUpperCase()))];
}

function parseBulbData(bulbs, answer, results) {
  if (bulbs.length === 0) return null;

  let lowBeam = null;
  let highBeam = null;

  if (bulbs.length === 1) {
    lowBeam = bulbs[0];
    highBeam = bulbs[0];
  } else {
    const allText = [answer, ...results.map(r => r.content || r.title || "")].join(" ").toLowerCase();

    for (const bulb of bulbs) {
      const idx = allText.indexOf(bulb.toLowerCase());

      if (idx === -1) continue;

      const start = Math.max(0, idx - 40);
      const end = Math.min(allText.length, idx + bulb.length + 40);
      const context = allText.slice(start, end);

      if (
        (context.includes("low") || context.includes("baja") || context.includes("bajo")) &&
        !lowBeam
      ) {
        lowBeam = bulb;
      } else if (
        (context.includes("high") || context.includes("alta") || context.includes("alto")) &&
        !highBeam
      ) {
        highBeam = bulb;
      }
    }

    if (!lowBeam) lowBeam = bulbs[0];
    if (!highBeam) highBeam = bulbs.length > 1 ? bulbs[1] : bulbs[0];
  }

  return {
    lowBeam,
    highBeam,
    fog: null,
    type: lowBeam !== highBeam ? "split" : "dual"
  };
}

function extractModel(message, year) {
  let model = message;
  if (year) model = model.replace(year, "");
  model = model.replace(/\b(un|una|unos|unas|el|la|los|las|de|del|para|tengo|mi|es|son|con|que|se|le|lo|en|al|por|las|los|carro|auto|vehiculo|camioneta|moto|camion|todoterreno)\b/gi, "");
  model = model.replace(/\s+/g, " ").trim();
  return model.toUpperCase() || "VEHICULO";
}

function looksLikeVehicleMessage(message) {
  if (message.length < 4) return false;

  if (/\b(19|20)\d{2}\b/.test(message)) return true;

  const triggers = ["mazda", "hyundai", "kia", "volkswagen", "vw", "renault", "suzuki", "seat", "bmw", "mercedes", "audi", "subaru", "jeep", "chrysler", "dodge", "peugeot", "fiat", "mini", "smart", "acura", "lexus", "infiniti", "toyota", "nissan", "honda", "chevrolet", "ford", "mitsubishi"];

  const lower = message.toLowerCase();
  return triggers.some(b => lower.includes(b));
}

function getCacheKey(message) {
  return message.toLowerCase().replace(/\s+/g, " ").trim();
}

function getCached(key) {
  const entry = cache.get(key);
  if (!entry) return null;
  if (Date.now() - entry.timestamp > CACHE_TTL) {
    cache.delete(key);
    return null;
  }
  return entry.data;
}

function setCache(key, data) {
  cache.set(key, { data, timestamp: Date.now() });
}

export async function webVehicleLookup({ message, year }) {
  const apiKey = process.env.TAVILY_API_KEY;
  if (!apiKey) return null;

  if (!looksLikeVehicleMessage(message)) return null;

  const cacheKey = getCacheKey(message);
  const cached = getCached(cacheKey);
  if (cached) return cached;

  const query = `${message} headlight bulb size type replacement`.trim();

  try {
    const response = await fetch("https://api.tavily.com/search", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        api_key: apiKey,
        query,
        search_depth: "basic",
        include_answer: true,
        max_results: 5
      }),
      signal: AbortSignal.timeout(15000)
    });

    if (!response.ok) {
      console.error(`Tavily API error: ${response.status}`);
      return null;
    }

    const data = await response.json();
    const answer = data.answer || "";
    const results = data.results || [];
    const allContent = [answer, ...results.map(r => r.title + " " + r.content)];
    const bulbs = extractBulbs(allContent.join(" "));

    if (bulbs.length === 0) return null;

    const vehicle = parseBulbData(bulbs, answer, results);
    if (!vehicle) return null;

    const model = extractModel(message, year);

    const result = {
      model,
      year,
      lowBeam: vehicle.lowBeam,
      highBeam: vehicle.highBeam,
      fog: vehicle.fog,
      type: vehicle.type
    };

    setCache(cacheKey, result);
    return result;

  } catch (error) {
    console.error("webVehicleLookup error:", error.message);
    return null;
  }
}
