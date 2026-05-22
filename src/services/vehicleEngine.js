const KNOWN_BULBS = {
  focus: 'H4',
  lancer: 'H4',
  camry: 'H11',
  corolla: '9005',
  civic: '9006',
  accord: 'H11',
  sentra: 'H4',
  altima: '9005',
  silverado: '9005',
  sierra: '9005',
  tacoma: 'H11',
  rav4: 'H11',
  crv: '9005',
  explorer: '9005',
  fusion: 'H11',
  escape: 'H11',
  malibu: 'H11',
  jetta: 'H7',
  ram: '9005',
  h3: 'H4'
};

const VEHICLE_MODELS = Object.keys(KNOWN_BULBS);

export function findVehicleBulb(message = '') {

  const text = message.toLowerCase().trim();

  const yearMatch = text.match(/\b(19|20)\d{2}\b/);

  const year = yearMatch ? yearMatch[0] : null;

  let detectedModel = null;

  for (const model of VEHICLE_MODELS) {
    if (text.includes(model)) {
      detectedModel = model;
      break;
    }
  }

  if (!detectedModel) {
    return null;
  }

  const bulb = KNOWN_BULBS[detectedModel] || 'H4';

  const formattedVehicle = `${detectedModel.toUpperCase()} ${year || ''}`.trim();

  return {
    vehicle: formattedVehicle,
    bulb
  };
}
