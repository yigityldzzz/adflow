// Meta Marketing API integration: OAuth token exchange, ad account listing,
// campaign listing, and spend syncing via the Insights endpoint.
//
// Requires a Meta App (developers.facebook.com) with the `ads_read`
// permission, configured via META_APP_ID / META_APP_SECRET / META_REDIRECT_URI
// env vars. In Development Mode, a Meta App can call this for its own admins/
// developers' ad accounts without going through App Review — App Review is
// only required once you want OTHER people's ad accounts to connect.

const GRAPH_VERSION = 'v19.0';
const GRAPH_BASE = `https://graph.facebook.com/${GRAPH_VERSION}`;

export interface MetaAdAccount {
  id: string; // "act_1234567890"
  name: string;
  account_status: number;
}

export interface MetaCampaign {
  id: string;
  name: string;
  status: string;
}

export interface TokenExchangeResult {
  accessToken: string;
  expiresInSeconds: number | null;
}

async function graphGet<T>(path: string, params: Record<string, string>): Promise<T> {
  const url = new URL(`${GRAPH_BASE}${path}`);
  for (const [k, v] of Object.entries(params)) url.searchParams.set(k, v);

  const resp = await fetch(url.toString(), { signal: AbortSignal.timeout(15000) });
  const json = (await resp.json()) as Record<string, unknown>;
  if (json['error']) {
    const err = json['error'] as Record<string, unknown>;
    throw new Error(String(err['message'] ?? 'Meta Graph API error'));
  }
  return json as T;
}

export function buildAuthorizeUrl(state: string): string {
  const appId = process.env.META_APP_ID;
  const redirectUri = process.env.META_REDIRECT_URI;
  const configId = process.env.META_CONFIG_ID;
  if (!appId || !redirectUri) {
    throw new Error('META_APP_ID / META_REDIRECT_URI not configured on the server');
  }
  const url = new URL(`https://www.facebook.com/${GRAPH_VERSION}/dialog/oauth`);
  url.searchParams.set('client_id', appId);
  url.searchParams.set('redirect_uri', redirectUri);
  if (configId) {
    // Facebook Login for Business: the config_id encodes both the
    // permissions and the Business Manager asset picker behavior, so it
    // replaces `scope` (this is what lets a Business-Manager-owned ad
    // account show up in the account picker, not just personal accounts).
    url.searchParams.set('config_id', configId);
  } else {
    url.searchParams.set('scope', 'ads_read,business_management');
  }
  url.searchParams.set('state', state);
  url.searchParams.set('response_type', 'code');
  return url.toString();
}

// Exchanges the OAuth `code` for a short-lived token, then immediately
// exchanges that for a long-lived (~60 day) token in one step.
export async function exchangeCodeForLongLivedToken(code: string): Promise<TokenExchangeResult> {
  const appId = process.env.META_APP_ID;
  const appSecret = process.env.META_APP_SECRET;
  const redirectUri = process.env.META_REDIRECT_URI;
  if (!appId || !appSecret || !redirectUri) {
    throw new Error('META_APP_ID / META_APP_SECRET / META_REDIRECT_URI not configured on the server');
  }

  const shortLived = await graphGet<{ access_token: string }>('/oauth/access_token', {
    client_id: appId,
    client_secret: appSecret,
    redirect_uri: redirectUri,
    code,
  });

  const longLived = await graphGet<{ access_token: string; expires_in?: number }>('/oauth/access_token', {
    grant_type: 'fb_exchange_token',
    client_id: appId,
    client_secret: appSecret,
    fb_exchange_token: shortLived.access_token,
  });

  return {
    accessToken: longLived.access_token,
    expiresInSeconds: longLived.expires_in ?? null,
  };
}

export async function listAdAccounts(accessToken: string): Promise<MetaAdAccount[]> {
  const res = await graphGet<{ data: MetaAdAccount[] }>('/me/adaccounts', {
    fields: 'id,name,account_status',
    access_token: accessToken,
  });
  return res.data;
}

export async function listCampaigns(accessToken: string, adAccountId: string): Promise<MetaCampaign[]> {
  const res = await graphGet<{ data: MetaCampaign[] }>(`/${adAccountId}/campaigns`, {
    fields: 'id,name,status',
    limit: '200',
    access_token: accessToken,
  });
  return res.data;
}

// Returns { campaignId: spendUSD } for every campaign in the ad account with
// spend in the given date range (defaults to "today").
export async function fetchCampaignSpend(
  accessToken: string,
  adAccountId: string,
  datePreset: string = 'today'
): Promise<Record<string, number>> {
  const res = await graphGet<{ data: Array<{ campaign_id: string; spend: string }> }>(`/${adAccountId}/insights`, {
    level: 'campaign',
    fields: 'campaign_id,spend',
    date_preset: datePreset,
    access_token: accessToken,
  });

  const spendByCampaign: Record<string, number> = {};
  for (const row of res.data) {
    spendByCampaign[row.campaign_id] = parseFloat(row.spend) || 0;
  }
  return spendByCampaign;
}

export interface DailyCampaignSpend {
  campaignId: string;
  date: string; // "YYYY-MM-DD"
  spend: number; // always USD — converted from the ad account's own currency
}

// Ad accounts can run in any local currency (TRY, EUR, ...) — the rest of
// AdFlow (dashboard, CampaignSpend, Campaign.cost) assumes USD everywhere,
// so Meta's raw `spend` figure must be converted before it's stored.
async function getAdAccountCurrency(accessToken: string, adAccountId: string): Promise<string> {
  const res = await graphGet<{ currency: string }>(`/${adAccountId}`, {
    fields: 'currency',
    access_token: accessToken,
  });
  return res.currency;
}

// Historical daily FX rates via the ECB-backed, free/keyless Frankfurter API.
// Returns a date -> rate map (1 unit of `fromCurrency` = rate USD).
// api.frankfurter.app now 301-redirects to this host, so call it directly.
// A few attempts, because a single slow response used to time out.
async function fetchUsdExchangeRates(
  fromCurrency: string,
  since: Date,
  until: Date
): Promise<Map<string, number>> {
  const fmt = (d: Date) => d.toISOString().slice(0, 10);
  const url = `https://api.frankfurter.dev/v1/${fmt(since)}..${fmt(until)}?from=${encodeURIComponent(fromCurrency)}&to=USD`;

  let lastError: unknown;
  for (let attempt = 1; attempt <= 3; attempt++) {
    try {
      const resp = await fetch(url, { signal: AbortSignal.timeout(15000) });
      if (!resp.ok) throw new Error(`Exchange rate lookup failed: HTTP ${resp.status}`);
      const json = (await resp.json()) as { rates?: Record<string, { USD?: number }> };

      const rates = new Map<string, number>();
      for (const [date, dayRates] of Object.entries(json.rates ?? {})) {
        if (typeof dayRates.USD === 'number' && dayRates.USD > 0) rates.set(date, dayRates.USD);
      }
      if (rates.size === 0) throw new Error(`Exchange rate lookup returned no ${fromCurrency}->USD rates`);
      return rates;
    } catch (err) {
      lastError = err;
      if (attempt < 3) await new Promise((r) => setTimeout(r, attempt * 2000));
    }
  }
  throw lastError;
}

// ECB publishes no rate for weekends/holidays, so a spend day can miss the
// map — walk backward to the nearest earlier trading day's rate. Days at the
// very start of the range (e.g. a Sunday) fall back to the closest rate in the
// map. Never returns 1: storing a TRY amount as USD would inflate cost ~50x.
function rateForDate(rates: Map<string, number>, dateStr: string): number {
  const d = new Date(`${dateStr}T00:00:00Z`);
  for (let i = 0; i < 14; i++) {
    const rate = rates.get(d.toISOString().slice(0, 10));
    if (rate !== undefined) return rate;
    d.setUTCDate(d.getUTCDate() - 1);
  }
  const target = new Date(`${dateStr}T00:00:00Z`).getTime();
  let best: { diff: number; rate: number } | null = null;
  for (const [date, rate] of rates) {
    const diff = Math.abs(new Date(`${date}T00:00:00Z`).getTime() - target);
    if (!best || diff < best.diff) best = { diff, rate };
  }
  if (!best) throw new Error(`No exchange rate available for ${dateStr}`);
  return best.rate;
}

// Same as fetchCampaignSpend but broken down per day (via time_increment),
// so cost can be filtered by date range instead of only ever being "spend
// as of the last sync". daysBack controls how far back to (re-)pull, since
// Meta's own daily numbers can be revised for a day or two after the fact.
export async function fetchCampaignDailySpend(
  accessToken: string,
  adAccountId: string,
  daysBack: number = 30
): Promise<DailyCampaignSpend[]> {
  // Deliberately NOT using `date_preset` here — Meta's Insights API has a
  // reproducible quirk where `date_preset` (e.g. last_7d/last_30d) combined
  // with `time_increment` silently returns an empty data array for
  // recently-active campaigns, even though the same range works fine as an
  // explicit `time_range`. Confirmed by testing both forms directly against
  // a real, currently-spending campaign.
  const until = new Date();
  const since = new Date(until.getTime() - daysBack * 24 * 60 * 60 * 1000);
  const fmt = (d: Date) => d.toISOString().slice(0, 10);

  const [res, currency] = await Promise.all([
    graphGet<{ data: Array<{ campaign_id: string; spend: string; date_start: string }> }>(
      `/${adAccountId}/insights`,
      {
        level: 'campaign',
        fields: 'campaign_id,spend',
        time_increment: '1',
        time_range: JSON.stringify({ since: fmt(since), until: fmt(until) }),
        access_token: accessToken,
      }
    ),
    getAdAccountCurrency(accessToken, adAccountId),
  ]);

  // If the FX lookup fails this throws, so the sync is skipped and the last
  // correctly converted numbers stay in place until the next run. (It used to
  // store the raw local-currency amount as USD — e.g. 2,141 TRY as $2,141.)
  let rates: Map<string, number> | null = null;
  if (currency !== 'USD') {
    rates = await fetchUsdExchangeRates(currency, since, until);
  }

  return res.data.map((row) => {
    const rawSpend = parseFloat(row.spend) || 0;
    const spend = rates ? rawSpend * rateForDate(rates, row.date_start) : rawSpend;
    return {
      campaignId: row.campaign_id,
      date: row.date_start,
      spend,
    };
  });
}
