export function detectSelectedProduct(message) {

  const text = message.toLowerCase().trim();

  /*
    ==================================================
    COB 2 CARAS
    ==================================================
  */

  if (

    text.includes("250") ||
    text.includes("$250") ||

    text.includes("economica") ||
    text.includes("económica") ||

    text.includes("barata") ||
    text.includes("baratas") ||

    text.includes("2 caras") ||
    text.includes("dos caras") ||
    text.includes("de 2 caras") ||
    text.includes("de dos caras") ||

    text.includes("las de 250") ||

    text.includes("quiero las de 250") ||

    text.includes("las mas baratas") ||
    text.includes("las más baratas") ||

    text.includes("económicas") ||
    text.includes("economicas")

  ) {

    return "COB 2 Caras $250";
  }

  /*
    ==================================================
    COB 4 CARAS
    ==================================================
  */

  if (

    text.includes("350") ||
    text.includes("$350") ||

    text.includes("4 caras") ||
    text.includes("cuatro caras") ||
    text.includes("de 4 caras") ||
    text.includes("de cuatro caras")

  ) {

    return "COB 4 Caras $350";
  }

  /*
    ==================================================
    CSP PREMIUM
    ==================================================
  */

  if (

    text.includes("500") ||
    text.includes("$500") ||

    text.includes("premium") ||
    text.includes("csp") ||

    text.includes("más caras") ||
    text.includes("mas caras") ||

    text.includes("las mejores") ||
    text.includes("las buenas") ||

    text.includes("las chidas") ||
    text.includes("las perras") ||

    text.includes("las premium") ||

    text.includes("recomiendas") ||
    text.includes("recomendar") ||

    text.includes("mejores") ||
    text.includes("mejor") ||

    text.includes("potentes") ||
    text.includes("potente")

  ) {

    return "CSP Premium $500";
  }

  return null;
}

export function detectConversationIntent(message) {

  const text = message.toLowerCase().trim();

  if (
    text.includes("precio") ||
    text.includes("cuanto") ||
    text.includes("cuánto") ||
    text.includes("en cuanto") ||
    text.includes("en cuánto") ||
    text.includes("dame precio") ||
    text.includes("cuanto cuestan") ||
    text.includes("cuánto cuestan")
  ) {
    return "ask_price";
  }

  if (
    text.includes("ya no quiero") ||
    text.includes("ya mejor no") ||
    text.includes("no gracias")
  ) {
    return "cancel";
  }

  if (
    text === "ok" ||
    text === "sale" ||
    text === "perfecto" ||
    text === "gracias" ||
    text === "va"
  ) {
    return "confirmation";
  }

  if (
    text.includes("muy caro") ||
    text.includes("estan caras") ||
    text.includes("están caras") ||
    text.includes("descuento") ||
    text.includes("mejor precio") ||
    text.includes("cuanto es lo menos") ||
    text.includes("más barato") ||
    text.includes("mas barato")
  ) {
    return "negotiation";
  }

  if (
    text.includes("amazon") ||
    text.includes("mercado libre")
  ) {
    return "comparison";
  }

  if (
    text.includes("alumbran") ||
    text.includes("si sirven") ||
    text.includes("sí sirven") ||
    text.includes("duran") ||
    text.includes("garantia") ||
    text.includes("garantía") ||
    text.includes("jalan bien") ||
    text.includes("andan machin")
  ) {
    return "quality_question";
  }

  if (
    text.includes("cual recomiendas") ||
    text.includes("cuál recomiendas") ||
    text.includes("cual conviene") ||
    text.includes("cuál conviene") ||
    text.includes("diferencia")
  ) {
    return "product_comparison";
  }

  if (
    text.includes("mañana") ||
    text.includes("despues") ||
    text.includes("después") ||
    text.includes("lo voy a pensar")
  ) {
    return "hesitation";
  }

  if (
    text.includes("grosero") ||
    text.includes("mal servicio") ||
    text.includes("que mal")
  ) {
    return "angry_customer";
  }

  return null;
}
