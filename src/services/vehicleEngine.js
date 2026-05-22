import { TOYOTA_DATABASE } from "../data/vehicleDatabaseToyota.js";
import { NISSAN_DATABASE } from "../data/vehicleDatabaseNissan.js";
import { HONDA_DATABASE } from "../data/vehicleDatabaseHonda.js";
import { CHEVROLET_DATABASE } from "../data/vehicleDatabaseChevrolet.js";
import { FORD_DATABASE } from "../data/vehicleDatabaseFord.js";
import { MITSUBISHI_DATABASE } from "../data/vehicleDatabaseMitsubishi.js";
import { normalize } from "../utils/normalize.js";

const DATABASE = {
  ...TOYOTA_DATABASE,
  ...NISSAN_DATABASE,
  ...HONDA_DATABASE,
  ...CHEVROLET_DATABASE,
  ...FORD_DATABASE,
  ...MITSUBISHI_DATABASE
};

function similarity(a, b) {
  a = normalize(a);
  b = normalize(b);

  if (!a || !b) return 0;

  if (a === b) return 1;

  if (
    (a.includes(b) || b.includes(a)) &&
    Math.min(a.length, b.length) >= 3
  ) {
    return 0.9;
  }

  let matches = 0;

  for (const char of a) {
    if (b.includes(char)) matches++;
  }

  return matches / Math.max(a.length, b.length);
}

function findVehicleModel(message) {
  const normalized = normalize(message);
  const words = normalized.split(/\s+/).filter(w => w.length > 0);

  if (words.length === 0) return null;

  let bestMatch = null;
  let bestScore = 0;

  for (const [model, data] of Object.entries(DATABASE)) {

    const aliases = [model, ...(data.aliases || [])];

    for (const alias of aliases) {
      const normalizedAlias = normalize(alias);
      if (!normalizedAlias) continue;

      for (const word of words) {
        if (word[0] !== normalizedAlias[0]) continue;

        const score = similarity(word, normalizedAlias);

        if (score > bestScore) {
          bestScore = score;
          bestMatch = {
            model,
            data
          };
        }
      }
    }
  }

  if (bestScore >= 0.65) {
    return bestMatch;
  }

  return null;
}

const GREETING_RE = /\b(buen[ao]s|hola|saludos|que tal|qué tal|gracias|no quiero|ya no|de que hablas|de qué hablas)\b/i;

function isGreetingOnly(message) {
  const words = message.trim().split(/\s+/);
  if (words.length > 4) return false;
  return GREETING_RE.test(message);
}

export function detectVehicleInfo(message) {

  if (isGreetingOnly(message)) return null;

  const found = findVehicleModel(message);

  if (!found) {
    return null;
  }

  const yearMatch = message.match(/\b(19|20)\d{2}\b/);
  const year = yearMatch ? yearMatch[0] : null;

  return {
    model: found.model.toUpperCase(),
    year,
    lowBeam: found.data.lowBeam,
    highBeam: found.data.highBeam,
    fog: found.data.fog,
    type: found.data.type
  };
}

const YEAR_RE = /\b(19|20)\d{2}\b/;

export function hasYearOnly(message) {
  const year = message.match(YEAR_RE);
  if (!year) return null;

  const rest = message
    .replace(YEAR_RE, "")
    .replace(/[^a-záéíóúñ\s]/gi, "")
    .toLowerCase()
    .trim();

  if (!rest) return year[0];

  const words = rest.split(/\s+/).filter(Boolean);
  const filler = new Set([
    "año", "el", "la", "los", "las", "de", "del", "es", "mi", "tu",
    "su", "un", "una", "en", "con", "para", "que", "se", "le", "lo",
    "no", "si", "por", "al"
  ]);

  const hasMeaningful = words.some(w => w.length >= 2 && !filler.has(w));
  if (!hasMeaningful) return year[0];

  return null;
}

export function buildVehicleResponse(vehicle) {

  if (!vehicle) return null;

  const sameBulb =
    vehicle.lowBeam === vehicle.highBeam;

  const modelDisplay = vehicle.year
    ? `${vehicle.model} ${vehicle.year}`
    : vehicle.model;

  let response = `🚘 [${modelDisplay}]\n\n`;

  if (sameBulb) {

    response += `🔦Usa ${vehicle.lowBeam}`;

    if (vehicle.type === "dual") {
      response += ` para altas y bajas\n\n`;
    } else {
      response += ` (1 función)\n`;
      response += `Se ocupa un foco para bajas y otro para altas\n\n`;
    }

  } else {

    response += `🔦 Baja: ${vehicle.lowBeam}\n`;
    response += `🔦 Alta: ${vehicle.highBeam}\n\n`;
  }

  response += `· COB 2 Caras $250 MXN
  6,000 lúmenes
  ✅ 3 meses de garantía

· COB 4 Caras $350 MXN
  12,000 lúmenes
  ✅ 3 meses de garantía

· CSP Premium $500 MXN
  20,000 lúmenes
  ✅ 6 meses de garantía
⭐ (recomendado)

🔧 Instalación: $100 MXN

📍 De La Torre LED Shop
📱 686 471 9077

🚗 Entregas:
✅ Portales
✅ Juventud 2000
✅ Costco
✅ Soriana Anáhuac
✅ Smart & Final
✅ Plaza Mandarin

🚘 A domicilio:
$100 MXN adicionales

¿Cuál desea?`;

  return response;
}
