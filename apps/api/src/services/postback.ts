// Fires an outbound S2S postback to a traffic source's own postback URL when a
// conversion happens, substituting AdFlow's macro tokens with real values.
// This makes the `postbackUrl` field on TrafficSource (and the {token} insert
// buttons already present in the UI) actually functional — previously the
// value was stored but never used anywhere.

interface PostbackContext {
  clickId: string | null;          // network's own click id, echoed back verbatim when available
  campaignId: string | null;
  campaignName: string | null;
  device: string | null;
  os: string | null;
  browser: string | null;
  country: string | null;
  city: string | null;
  ip: string | null;
  value: number;
}

function buildMacroMap(ctx: PostbackContext): Record<string, string> {
  return {
    '{clickid}': ctx.clickId ?? '',
    '{campaign.id}': ctx.campaignId ?? '',
    '{campaign.name}': ctx.campaignName ?? '',
    '{device}': ctx.device ?? '',
    '{os}': ctx.os ?? '',
    '{browser}': ctx.browser ?? '',
    '{country}': ctx.country ?? '',
    '{city}': ctx.city ?? '',
    '{cost}': String(ctx.value ?? 0),
    '{ip}': ctx.ip ?? '',
  };
}

export function renderPostbackUrl(template: string, ctx: PostbackContext): string {
  const macros = buildMacroMap(ctx);
  let url = template;
  for (const [token, value] of Object.entries(macros)) {
    url = url.split(token).join(encodeURIComponent(value));
  }
  return url;
}

export async function fireGenericPostback(template: string, ctx: PostbackContext): Promise<void> {
  const url = renderPostbackUrl(template, ctx);
  try {
    const res = await fetch(url, { method: 'GET', signal: AbortSignal.timeout(8000) });
    if (!res.ok) {
      console.error('[Postback] non-2xx response', res.status, url);
    }
  } catch (e) {
    console.error('[Postback] failed', e instanceof Error ? e.message : e, url);
  }
}
