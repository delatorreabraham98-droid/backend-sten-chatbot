import { TOYOTA_DATABASE } from "../data/vehicleDatabaseToyota.js";
import { NISSAN_DATABASE } from "../data/vehicleDatabaseNissan.js";
import { HONDA_DATABASE } from "../data/vehicleDatabaseHonda.js";
import { CHEVROLET_DATABASE } from "../data/vehicleDatabaseChevrolet.js";
import { FORD_DATABASE } from "../data/vehicleDatabaseFord.js";

const DATABASE = {
  ...TOYOTA_DATABASE,
  ...NISSAN_DATABASE,
  ...HONDA_DATABASE,
  ...CHEVROLET_DATABASE,
  ...FORD_DATABASE
};

function normalize(text = "") {
  return text
    .toLowerCase()
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "")
    .replace(/[^a-z0-9\s]/g, "")
    .trim();
}

function similarity(a, b) {
  a = normalize(a);
  b = normalize(b);

  if (a === b) return 1;

  if (a.includes(b) || b.includes(a)) {
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

  let bestMatch = null;
  let bestScore = 0;

  for (const [model, data] of Object.entries(DATABASE)) {

    const aliases = [model, ...(data.aliases || [])];

    for (const alias of aliases) {

      const score = similarity(normalized, alias);

      if (score > bestScore) {
        bestScore = score;
        bestMatch = {
          model,
          data
        };
      }
    }
  }

  if (bestScore >= 0.55) {
    return bestMatch;
  }

  return null;
}

export function detectVehicleInfo(message) {

  const found = findVehicleModel(message);

  if (!found) {
    return null;
  }

  return {
    model: found.model.toUpperCase(),
    lowBeam: found.data.lowBeam,
    highBeam: found.data.highBeam,
    fog: found.data.fog,
    type: found.data.type
  };
}

export function buildVehicleResponse(vehicle) {

  if (!vehicle) return null;

  const sameBulb =
    vehicle.lowBeam === vehicle.highBeam;

  let response = `🚘 [${vehicle.model}]\n\n`;

  if (sameBulb) {

    response += `🔦 Usa ${vehicle.lowBeam}`;

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
✅ 3 meses garantía

· COB 4 Caras $350 MXN
✅ 3 meses garantía

· CSP Premium $500 MXN
✅ 6 meses garantía
⭐ Recomendado

¿Cuál desea?`;

  return response;
}
