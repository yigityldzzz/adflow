import geoip from 'geoip-lite';

const countryMap: Record<string, string> = {
  US: 'United States',
  DE: 'Germany',
  TR: 'Turkey',
  GB: 'United Kingdom',
  FR: 'France',
  NL: 'Netherlands',
  IT: 'Italy',
  ES: 'Spain',
  CA: 'Canada',
  AU: 'Australia',
  JP: 'Japan',
  BR: 'Brazil',
  IN: 'India',
  MX: 'Mexico',
  RU: 'Russia',
  CN: 'China',
  KR: 'South Korea',
  PL: 'Poland',
  SE: 'Sweden',
  NO: 'Norway',
  DK: 'Denmark',
  FI: 'Finland',
  CH: 'Switzerland',
  AT: 'Austria',
  BE: 'Belgium',
  PT: 'Portugal',
  GR: 'Greece',
  CZ: 'Czech Republic',
  HU: 'Hungary',
  RO: 'Romania',
  ZA: 'South Africa',
  NG: 'Nigeria',
  EG: 'Egypt',
  AR: 'Argentina',
  CL: 'Chile',
  CO: 'Colombia',
  PE: 'Peru',
  ID: 'Indonesia',
  TH: 'Thailand',
  VN: 'Vietnam',
  MY: 'Malaysia',
  SG: 'Singapore',
  PH: 'Philippines',
  SA: 'Saudi Arabia',
  AE: 'United Arab Emirates',
  IL: 'Israel',
  PK: 'Pakistan',
  BD: 'Bangladesh',
};

function getCountryName(code: string): string {
  return countryMap[code] || code;
}

export interface GeoData {
  country: string | null;
  countryCode: string | null;
  region: string | null;
  city: string | null;
  timezone: string | null;
}

export function lookupGeo(ip: string): GeoData {
  // Strip IPv6-mapped IPv4 prefix
  const cleanIp = ip.replace(/^::ffff:/, '');

  const geo = geoip.lookup(cleanIp);
  if (!geo) {
    return {
      country: null,
      countryCode: null,
      region: null,
      city: null,
      timezone: null,
    };
  }

  return {
    country: geo.country ? getCountryName(geo.country) : null,
    countryCode: geo.country || null,
    region: geo.region || null,
    city: geo.city || null,
    timezone: geo.timezone || null,
  };
}
