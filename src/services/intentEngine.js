export function detectSelectedProduct(message) {

  const text = message.toLowerCase();

  if (
    text.includes("250") ||
    text.includes("2 caras") ||
    text.includes("economicas")
  ) {
    return "COB 2 Caras $250";
  }

  if (
    text.includes("350") ||
    text.includes("4 caras")
  ) {
    return "COB 4 Caras $350";
  }

  if (
    text.includes("500") ||
    text.includes("premium") ||
    text.includes("csp")
  ) {
    return "CSP Premium $500";
  }

  return null;
}

export function detectConversationIntent(message) {

  const text = message.toLowerCase();

  if (
    text.includes("estan caras") ||
    text.includes("muy caro") ||
    text.includes("descuento") ||
    text.includes("mejor precio") ||
    text.includes("cuanto es lo menos")
  ) {
    return "negotiation";
  }

  if (
    text.includes("amazon") ||
    text.includes("mercado libre") ||
    text.includes("mas baratas")
  ) {
    return "comparison";
  }

  if (
    text.includes("alumbran") ||
    text.includes("si sirven") ||
    text.includes("duran") ||
    text.includes("garantia") ||
    text.includes("jalan bien") ||
    text.includes("andan machin")
  ) {
    return "quality_question";
  }

  if (
    text.includes("diferencia") ||
    text.includes("cual recomiendas") ||
    text.includes("cual conviene")
  ) {
    return "product_comparison";
  }

  if (
    text.includes("mañana") ||
    text.includes("despues") ||
    text.includes("lo voy a pensar")
  ) {
    return "hesitation";
  }

  return null;
}
