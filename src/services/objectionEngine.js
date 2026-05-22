export function handleObjection(message) {
  const text = message.toLowerCase();

  if (text.includes('muy caro') || text.includes('estan caras')) {
    return 'Sí le entiendo 👌\n\nLas de $250 son la opción económica y sí mejoran bastante comparadas con halógeno normal.';
  }

  if (text.includes('amazon') || text.includes('mercado libre')) {
    return 'Sí hay algunas más baratas, pero muchas veces duran menos o alumbran menos.\n\nLas nuestras ya están probadas en muchísimos carros 👌';
  }

  if (text.includes('lo voy a pensar')) {
    return 'Claro 👌\n\nAquí seguimos a la orden. Las CSP Premium son las más buscadas 🔥';
  }

  return null;
}
