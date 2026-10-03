// Known bot IP prefixes (IPv4 and IPv6)
const BOT_IP_PREFIXES = [
  '2a03:2880:', // Meta/Facebook data centers
  '2620:10d:',  // Meta/Facebook data centers
  '31.13.',     // Meta/Facebook
  '157.240.',   // Meta/Facebook
  '173.252.',   // Meta/Facebook
  '69.63.',     // Meta/Facebook
  '66.220.',    // Meta/Facebook
];

// Google crawler / ad-review data centers (AdsBot, Ads creative checks, Googlebot)
const GOOGLE_IP_PREFIXES = [
  '66.249.',
  '74.125.',
  '2001:4860:',
];

export function detectBot(
  userAgent: string,
  ip: string
): { isBot: boolean; isSuspicious: boolean } {
  const botPatterns = [
    /googlebot/i,
    /bingbot/i,
    /slurp/i,
    /duckduckbot/i,
    /baiduspider/i,
    /yandexbot/i,
    /sogou/i,
    /exabot/i,
    /facebot/i,
    /facebookexternalhit/i,
    /facebookcatalog/i,
    /meta-externalagent/i,
    /ia_archiver/i,
    /semrushbot/i,
    /ahrefsbot/i,
    /mj12bot/i,
    /dotbot/i,
    /rogerbot/i,
    // Google Ads review / creative crawlers (often with a normal mobile Chrome UA)
    /adsbot-google/i,
    /google-adwords/i,
    /google-ads-creatives-assistant/i,
    /googleother/i,
    /google-inspectiontool/i,
    /mediapartners-google/i,
    /^google$/i,
    /curl\//,
    /wget\//i,
    /python-requests/i,
    /go-http-client/i,
    /java\//i,
    /libwww-perl/i,
    /scrapy/i,
    /phantomjs/i,
    /headlesschrome/i,
    /applebot/i,
    /twitterbot/i,
    /linkedinbot/i,
    /whatsapp/i,
    /telegrambot/i,
  ];

  const uaIsBot = botPatterns.some((p) => p.test(userAgent));
  const ipIsBot = [...BOT_IP_PREFIXES, ...GOOGLE_IP_PREFIXES].some((prefix) => ip.startsWith(prefix));
  const isBot = uaIsBot || ipIsBot;

  // Suspicious: empty UA, very short UA, or near-empty after trimming
  const isSuspicious =
    !isBot && (
      !userAgent ||
      userAgent.length < 10 ||
      /^(Mozilla\/5\.0\s*)?$/.test(userAgent.trim())
    );

  return { isBot, isSuspicious };
}

// Ad-platform reviewers and link-preview crawlers (Meta/Facebook, Google Ads).
// They are still bots for reporting, but they must be able to load the real
// landing page — otherwise the platform shows no link preview or rejects the ad
// as having a broken destination.
const AD_REVIEWER_PATTERNS = [
  /facebookexternalhit/i,
  /facebot/i,
  /facebookcatalog/i,
  /meta-externalagent/i,
  /adsbot-google/i,
  /mediapartners-google/i,
  /google-adwords/i,
  /google-ads-creatives-assistant/i,
  /googleother/i,
  /google-inspectiontool/i,
  /^google$/i,
];

export function isAdReviewer(userAgent: string, ip: string): boolean {
  if (AD_REVIEWER_PATTERNS.some((p) => p.test(userAgent))) return true;
  // Meta and Google review ads from their own data centers, sometimes with a normal browser UA
  return [...BOT_IP_PREFIXES, ...GOOGLE_IP_PREFIXES].some((prefix) => ip.startsWith(prefix));
}
