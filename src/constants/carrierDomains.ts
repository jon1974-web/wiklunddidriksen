const CARRIER_DOMAINS: Record<string, string> = {
  'norwegian': 'norwegian.com',
  'norwegian air': 'norwegian.com',
  'norwegian air shuttle': 'norwegian.com',
  'sas': 'sas.se',
  'scandinavian airlines': 'sas.se',
  'sas scandinavian': 'sas.se',
  'widerøe': 'wideroe.no',
  'wideroe': 'wideroe.no',
  'sunt': 'sunt.no',
  'flyr': 'flyr.com',
  'british airways': 'britishairways.com',
  'lufthansa': 'lufthansa.com',
  'klm': 'klm.com',
  'air france': 'airfrance.com',
  'ryanair': 'ryanair.com',
  'easyjet': 'easyjet.com',
  'sas link': 'sas.no',
  'jonker': 'jonker.no',
  'vy': 'vy.no',
  'vy tog': 'vy.no',
  'sj': 'sj.se',
  'sj nord': 'sj.se',
  'flytoget': 'flytoget.no',
  'flybussen': 'flybussen.no',
  'nettbuss': 'nettbuss.no',
  'flixbus': 'flixbus.com',
  'hertz': 'hertz.com',
  'avis': 'avis.com',
  'europcar': 'europcar.com',
  'sixt': 'sixt.com',
  'budget': 'budget.com',
  'enterprise': 'enterprise.com',
  'national': 'nationalcar.com',
  'alamo': 'alamo.com',
  'dollar': 'dollar.com',
  'thrifty': 'thrifty.com',
  'free2rent': 'free2rent.si',
};

export function getCarrierDomain(name: string): string | null {
  const lower = name.toLowerCase().trim();
  if (CARRIER_DOMAINS[lower]) return CARRIER_DOMAINS[lower];
  for (const [key, domain] of Object.entries(CARRIER_DOMAINS)) {
    if (lower.includes(key) || key.includes(lower)) return domain;
  }
  return null;
}
