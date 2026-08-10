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
  const ipIsBot = BOT_IP_PREFIXES.some((prefix) => ip.startsWith(prefix));
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
