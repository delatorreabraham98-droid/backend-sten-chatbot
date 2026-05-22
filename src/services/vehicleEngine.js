const VEHICLE_DATABASE = [
  {
    keywords: ['focus 2002', 'ford focus 2002'],
    vehicle: 'Ford Focus 2002',
    bulb: 'H4'
  },
  {
    keywords: ['lancer 2003'],
    vehicle: 'Lancer 2003',
    bulb: 'H4'
  },
  {
    keywords: ['hummer h3 2010', 'hummer h3'],
    vehicle: 'Hummer H3 2010',
    bulb: 'H4'
  },
  {
    keywords: ['camry'],
    vehicle: 'Toyota Camry',
    bulb: 'H11'
  }
];

export function findVehicleBulb(message = '') {
  const text = message.toLowerCase();

  for (const item of VEHICLE_DATABASE) {
    for (const keyword of item.keywords) {
      if (text.includes(keyword)) {
        return {
          vehicle: item.vehicle,
          bulb: item.bulb
        };
      }
    }
  }

  return null;
}
