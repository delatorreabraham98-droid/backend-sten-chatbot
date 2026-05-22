import { normalize } from "../utils/normalize.js";

const PRODUCT_MAPPINGS = [

  // COB 2 CARAS

  {
    product: "COB_2_CARAS",
    price: 250,
    keywords: [
      "2 caras",
      "dos caras",
      "baratas",
      "economicas",
      "económicas",
      "basicas",
      "básicas",
      "250",
      "$250",
      "las mas baratas",
      "las baratas",
      "las sencillas",
      "las normales",
      "la 1",
      "la primera",
      "opcion 1",
      "opción 1"
    ]
  },

  // COB 4 CARAS

  {
    product: "COB_4_CARAS",
    price: 350,
    keywords: [
      "4 caras",
      "cuatro caras",
      "350",
      "$350",
      "intermedias",
      "mejores que las basicas",
      "mas luz",
      "más luz",
      "la 2",
      "la segunda",
      "opcion 2",
      "opción 2"
    ]
  },

  // CSP PREMIUM

  {
    product: "CSP_PREMIUM",
    price: 500,
    keywords: [
      "premium",
      "csp",
      "las buenas",
      "las mejores",
      "las premium",
      "de calidad",
      "potentes",
      "500",
      "$500",
      "recomendadas",
      "recomendacion",
      "recomendación",
      "quiero calidad",
      "quiero algo bueno",
      "quiero las mejores",
      "las chidas",
      "la 3",
      "la tercera",
      "opcion 3",
      "opción 3"
    ]
  }

];

const OBJECTION_PATTERNS = [

  {
    type: "BAD_PREVIOUS_EXPERIENCE",
    keywords: [
      "salieron malas",
      "salieron chafas",
      "me duraron poco",
      "no alumbraban",
      "no sirven",
      "compre unas y salieron malas",
      "compré unas y salieron malas",
      "compre unas y estaban chafas",
      "compré unas y estaban chafas"
    ]
  },

  {
    type: "PRICE_OBJECTION",
    keywords: [
      "muy caras",
      "muy caro",
      "estan caras",
      "están caras",
      "porque tan caras",
      "por que tan caras"
    ]
  }

];

export function detectProductIntent(message = "") {

  const text = normalize(message);

  for (const mapping of PRODUCT_MAPPINGS) {

    for (const keyword of mapping.keywords) {

      if (text.includes(normalize(keyword))) {

        return {
          product: mapping.product,
          price: mapping.price
        };
      }
    }
  }

  return null;
}

export function detectObjection(message = "") {

  const text = normalize(message);

  for (const objection of OBJECTION_PATTERNS) {

    for (const keyword of objection.keywords) {

      if (text.includes(normalize(keyword))) {

        return objection.type;
      }
    }
  }

  return null;
}

export function buildObjectionReply(type) {

  switch (type) {

    case "BAD_PREVIOUS_EXPERIENCE":

      return `😅 Sí pasa mucho con las genéricas baratas.

Las nuestras ya las probamos aquí en Mexicali 🔥

✅ Buena intensidad
✅ Mejor disipación
✅ Garantía real

Las CSP Premium son las que más recomendamos porque duran mucho más 👌`;

    case "PRICE_OBJECTION":

      return `🔥 Tratamos de manejar buena calidad para evitar fallas.

Además incluyen garantía real 👌

Las de 2 caras salen muy buenas si busca algo económico.`;

    default:
      return null;
  }
}

export function buildProductReply(intent, vehicle) {

  if (!intent) return null;

  const lowBeam =
    vehicle?.lowBeam || "compatible";

  const highBeam =
    vehicle?.highBeam || lowBeam;

  const sameBulb =
    lowBeam === highBeam;

  let bulbText = "";

  if (sameBulb) {
    bulbText = `💡 Medida: ${lowBeam}`;
  } else {
    bulbText =
`💡 Baja: ${lowBeam}
💡 Alta: ${highBeam}`;
  }

  switch (intent.product) {

    case "COB_2_CARAS":

      return `🔥 Tenemos las COB 2 Caras

${bulbText}

💰 Precio: $250 MXN
✅ 3 meses garantía

Son las más económicas y jalan muy bien 👌

¿Desea instalación también?`;

    case "COB_4_CARAS":

      return `🔥 Tenemos las COB 4 Caras

${bulbText}

💰 Precio: $350 MXN
✅ 3 meses garantía

✅ Mejor dispersión
✅ Más intensidad
✅ Mejor iluminación lateral 🔥

¿Desea instalación también?`;

    case "CSP_PREMIUM":

      return `🔥 Las CSP Premium son las más recomendadas

${bulbText}

💰 Precio: $500 MXN
✅ 6 meses garantía

✅ Mucha más potencia
✅ Mejor duración
✅ Luz más limpia
✅ Mejor alcance
✅ Excelente para carretera 🔥

Son las que más vendemos 👌`;

    default:
      return null;
  }
}
