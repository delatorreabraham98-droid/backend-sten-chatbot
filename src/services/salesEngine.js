export function generateSalesReply(intent) {

  switch(intent) {

    case "negotiation":

      return `
Sí le entiendo.

Las de $250 son la opción económica
y sí mejoran bastante comparadas
con halógeno normal.

Las premium son para clientes
que quieren máxima claridad.

¿Cuáles le interesan más?
250 / 350 / 500
`.trim();

    case "comparison":

      return `
Sí hay algunas más baratas.

La diferencia normalmente
es cuánto duran
y qué tanto alumbran realmente.

Las nuestras ya están probadas
en muchísimos carros.

¿Busca algo económico
o algo que realmente alumbre muchísimo?
`.trim();

    case "quality_question":

      return `
Sí alumbran muchísimo mejor
que halógeno normal.

Las CSP Premium son las que más
se llevan porque dan mucha claridad
y duran bastante.

¿Quiere algo económico
u opción premium?
`.trim();

    case "product_comparison":

      return `
Las de $250 son la opción económica.

Las de $350 alumbran más.

Y las CSP Premium son las más potentes
además de durar bastante más.

¿Cuáles le interesan más?
250 / 350 / 500
`.trim();

    case "hesitation":

      return `
Claro.

Aquí seguimos a la orden.

Normalmente las premium son
las que más se terminan llevando
porque sí hay bastante diferencia.
`.trim();

    default:

      return null;
  }
}
