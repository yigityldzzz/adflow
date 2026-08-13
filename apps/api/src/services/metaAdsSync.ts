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
  if (!appId || !redirectUri) {
    throw new Error('META_APP_ID / META_REDIRECT_URI not configured on the server');
  }
  const url = new URL(`https://www.facebook.com/${GRAPH_VERSION}/dialog/oauth`);
  url.searchParams.set('client_id', appId);
  url.searchParams.set('redirect_uri', redirectUri);
  url.searchParams.set('scope', 'ads_read');
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
