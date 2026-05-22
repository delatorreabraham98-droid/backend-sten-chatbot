export function generateSalesReply(intent) {

  switch(intent) {

    case "confirmation":

      return `
Perfecto 👌

Seguimos con su pedido.

¿Desea instalación,
punto medio
o entrega a domicilio?
`.trim();

    case "call_question":

      return `
No necesariamente.

También podemos seguir
por aquí mismo y coordinar
su instalación o entrega.
`.trim();

    case "cancel":

      return `
Claro.

Aquí seguimos a la orden
por si después le interesa.
`.trim();

    case "angry_customer":

      return `
Perdón.

A veces sigo aprendiendo.

Sí podemos ayudarle
con su instalación o entrega.
`.trim();

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
Claro 👌

Aquí seguimos a la orden.

Las de $250 son las económicas
y sí mejoran bastante comparadas
con halógeno normal.
`.trim();

    case "vehicle_year_missing":

      return `
¿Qué año es su vehículo?
`.trim();

    case "continue_sale":

      return buildContinueSaleReply();

    default:

      return null;
  }
}

export function buildContinueSaleReply() {
  return `
Seguimos con su cotización 👌

Opciones disponibles:

🔹 COB 2 Caras — $250
🔹 COB 4 Caras — $350
🔹 CSP Premium — $500

¿Cuál le interesa?
`.trim();
}

export function generateObjectionReply(type = 'default') {
  if (type === 'price') {
    return 'Las de $250 son muy buena opción si busca algo económico 👌';
  }

  return 'Aquí seguimos para ayudarle 👌';
}

export function generatePersuasionReply(type = 'premium') {
  if (type === 'premium') {
    return 'Las CSP Premium son las más recomendadas 🔥';
  }

  return 'Tenemos varias opciones disponibles 👌';
}
