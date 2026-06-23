export function getFaviconUrl(urlOrDomain: string): string {
  let hostname = '';
  try {
    if (urlOrDomain.includes('://')) {
      hostname = new URL(urlOrDomain).hostname;
    } else {
      hostname = urlOrDomain.replace(/^www\./, '');
    }
  } catch {
    hostname = urlOrDomain.replace(/^www\./, '');
  }
  if (!hostname) return '';
  return `https://www.google.com/s2/favicons?domain=${hostname}&sz=64`;
}

export function extractDomain(url: string): string {
  try {
    const hostname = new URL(url).hostname;
    return hostname.replace('www.', '');
  } catch {
    return url;
  }
}
