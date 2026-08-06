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
  'color line': 'colorline.com',
  'colorline': 'colorline.com',
  'fjord line': 'fjordline.com',
  'fjordline': 'fjordline.com',
  'stena line': 'stenaline.com',
  'stenaline': 'stenaline.com',
  'hurtigruten': 'hurtigruten.com',
  'havyard': 'havyard.no',
  'torghatten': 'torghatten.no',
  'boreal': 'boreal.no',
  'tide': 'tideselskapet.no',
  'norled': 'norled.no',
  'lf ferjer': 'ffferjer.no',
  'ferjeforbindelsen': 'ffferjer.no',
  'nettbuss': 'nettbuss.no',
  'taxi': 'taxi.no',
  'oslo taxi': 'oslotaxi.no',
  'bergen taxi': 'bergentaxi.no',
  'trondheim taxi': 'trondheimtaxi.no',
  'norges taxi': 'norgestaxi.no',
  '0 taxi': '0taxi.no',
  'nordic taxi': 'nordictaxi.no',
  'uber': 'uber.com',
  'bolt': 'bolt.eu',
  'yango': 'yango.com',
  'tvind': 'tvind.no',
  'tvind taxi': 'tvind.no',
};

export function getCarrierDomain(name: string): string | null {
  const lower = name.toLowerCase().trim();
  if (CARRIER_DOMAINS[lower]) return CARRIER_DOMAINS[lower];
  for (const [key, domain] of Object.entries(CARRIER_DOMAINS)) {
    if (lower.includes(key) || key.includes(lower)) return domain;
  }
  // Domain guessing: try to construct a domain from the company name
  const cleaned = lower.replace(/[^a-z0-9\s]/g, '').replace(/\s+/g, '');
  if (cleaned.length >= 3) {
    const tlds = ['.com', '.no', '.eu', '.org'];
    for (const tld of tlds) {
      const guessed = cleaned + tld;
      if (guessableDomains[guessed]) return guessed;
    }
    return cleaned + '.com';
  }
  return null;
}

const guessableDomains: Record<string, boolean> = {};
