const VEHICLE_DATABASE = {
  focus: {
    bulb: 'H4',
    type: 'dual'
  },
  lancer: {
    bulb: 'H4',
    type: 'dual'
  },
  camry: {
    bulb: 'H11',
    type: 'single'
  },
  corolla: {
    bulb: '9005 / 9006',
    type: 'split'
  },
  civic: {
    bulb: '9005 / 9006',
    type: 'split'
  },
  accord: {
    bulb: 'H11',
    type: 'single'
  },
  sentra: {
    bulb: 'H4',
    type: 'dual'
  },
  altima: {
    bulb: '9005 / 9006',
    type: 'split'
  },
  silverado: {
    bulb: '9005 / 9006',
    type: 'split'
  },
  sierra: {
    bulb: '9005 / 9006',
    type: 'split'
  },
  tacoma: {
    bulb: 'H11',
    type: 'single'
  },
  rav4: {
    bulb: '9005 / 9006',
    type: 'split'
  },
  crv: {
    bulb: '9005 / 9006',
    type: 'split'
  },
  explorer: {
    bulb: '9005 / 9006',
    type: 'split'
  },
  fusion: {
    bulb: 'H11',
    type: 'single'
  },
  escape: {
    bulb: 'H11',
    type: 'single'
  },
  malibu: {
    bulb: 'H11',
    type: 'single'
  },
  jetta: {
    bulb: 'H7',
    type: 'single'
  },
  ram: {
    bulb: '9005 / 9006',
    type: 'split'
  },
  h3: {
    bulb: 'H4',
    type: 'dual'
  },
  sonata: {
    bulb: 'H11',
    type: 'single'
  }
};

const VEHICLE_MODELS = Object.keys(VEHICLE_DATABASE);

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

  const vehicleData = VEHICLE_DATABASE[detectedModel];

  const formattedVehicle = `${detectedModel.toUpperCase()} ${year || ''}`.trim();

  return {
    vehicle: formattedVehicle,
    bulb: vehicleData.bulb,
    bulbType: vehicleData.type
  };
}
