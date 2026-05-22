function normalize(text = "") {
  return text
    .toLowerCase()
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "")
    .trim();
}

const CHEAP_KEYWORDS = [
  "baratas",
  "economicas",
  "economicas",
  "2 caras",
  "dos caras",
  "$250",
  "250"
];

const PREMIUM_KEYWORDS = [
  "premium",
  "mejores",
  "buenas",
  "calidad",
  "potentes",
  "500",
  "$500",
  "csp"
];

const MID_KEYWORDS = [
  "4 caras",
  "cuatro caras",
  "$350",
  "350"
];

export function detectProductIntent(message = "") {

  const text = normalize(message);

  for (const keyword of CHEAP_KEYWORDS) {
    if (text.includes(keyword)) {
      return {
        product: "COB_2_CARAS",
        price: 250
      };
    }
  }

  for (const keyword of MID_KEYWORDS) {
    if (text.includes(keyword)) {
      return {
        product: "COB_4_CARAS",
        price: 350
      };
    }
  }

  for (const keyword of PREMIUM_KEYWORDS) {
    if (text.includes(keyword)) {
      return {
        product: "CSP_PREMIUM",
        price: 500
      };
    }
  }

  return null;
}

export function buildProductReply(intent, vehicle) {

  if (!intent) return null;

  const bulb =
    vehicle?.lowBeam || "compatible";

  switch (intent.product) {

    case "COB_2_CARAS":

      return `🔥 Tenemos las COB 2 Caras

💡 Medida: ${bulb}
💰 Precio: $250 MXN
✅ 3 meses garantía

Son las más económicas y jalan muy bien 👌

¿Desea instalación también?`;

    case "COB_4_CARAS":

      return `🔥 Tenemos las COB 4 Caras

💡 Medida: ${bulb}
💰 Precio: $350 MXN
✅ 3 meses garantía

Alumbran más que las básicas y tienen mejor dispersión 🔥

¿Desea instalación también?`;

    case "CSP_PREMIUM":

      return `🔥 Las CSP Premium son las más recomendadas

💡 Medida: ${bulb}
💰 Precio: $500 MXN
✅ 6 meses garantía

✅ Mucho más potencia
✅ Mejor duración
✅ Mejor intensidad
✅ Luz más limpia

Son ideales si quiere buena calidad 🔥`;

    default:
      return null;
  }
}
