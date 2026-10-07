import crypto from 'crypto';
import { webBaseUrl } from '../config/urls';

const API_BASE = 'https://api.lemonsqueezy.com/v1';

function getApiKey(): string {
  const key = process.env.LEMONSQUEEZY_API_KEY;
  if (!key) throw new Error('LEMONSQUEEZY_API_KEY not configured');
  return key;
}

function getStoreId(): string {
  const id = process.env.LEMONSQUEEZY_STORE_ID;
  if (!id) throw new Error('LEMONSQUEEZY_STORE_ID not configured');
  return id;
}

// Maps a Lemon Squeezy variant id to our internal Plan enum value. Kept as a
// function (not a module-level constant) so it always reads the current
// process.env instead of whatever was set at import time.
export function planForVariant(variantId: string): 'PRO' | 'TEAM' | null {
  if (variantId === process.env.LEMONSQUEEZY_VARIANT_PRO) return 'PRO';
  if (variantId === process.env.LEMONSQUEEZY_VARIANT_TEAM) return 'TEAM';
  return null;
}

export async function createCheckoutUrl(params: {
  variantId: string;
  userId: string;
  email: string;
  name?: string | null;
}): Promise<string> {
  const res = await fetch(`${API_BASE}/checkouts`, {
    method: 'POST',
    headers: {
      Authorization: `Bearer ${getApiKey()}`,
      'Content-Type': 'application/vnd.api+json',
      Accept: 'application/vnd.api+json',
    },
    body: JSON.stringify({
      data: {
        type: 'checkouts',
        attributes: {
          checkout_data: {
            email: params.email,
            name: params.name ?? undefined,
            custom: { user_id: params.userId },
          },
          // Send the buyer back to AdFlow after paying (the success modal's
          // button and the receipt email's button) instead of leaving them on
          // Lemon Squeezy's order page.
          product_options: {
            redirect_url: `${webBaseUrl()}/settings?tab=billing&upgraded=1`,
            receipt_button_text: 'Open AdFlow',
            receipt_link_url: `${webBaseUrl()}/dashboard`,
          },
        },
        relationships: {
          store: { data: { type: 'stores', id: getStoreId() } },
          variant: { data: { type: 'variants', id: params.variantId } },
        },
      },
    }),
  });

  if (!res.ok) {
    const text = await res.text();
    throw new Error(`Lemon Squeezy checkout creation failed (${res.status}): ${text}`);
  }

  const json = (await res.json()) as { data: { attributes: { url: string } } };
  return json.data.attributes.url;
}

export interface LsSubscription {
  status: string;
  variantId: string;
  renewsAt: string | null;
  endsAt: string | null;
  trialEndsAt: string | null;
  cardBrand: string | null;
  cardLastFour: string | null;
  customerPortalUrl: string | null;
  updatePaymentMethodUrl: string | null;
}

// Fetches the live state of one subscription. Returns null when Lemon Squeezy
// doesn't know it (404) — e.g. a test-mode subscription once the API key is
// switched to live mode — so callers can fall back to what we stored.
export async function getSubscription(subscriptionId: string): Promise<LsSubscription | null> {
  const res = await fetch(`${API_BASE}/subscriptions/${encodeURIComponent(subscriptionId)}`, {
    headers: {
      Authorization: `Bearer ${getApiKey()}`,
      Accept: 'application/vnd.api+json',
    },
  });

  if (res.status === 404) return null;
  if (!res.ok) {
    const text = await res.text();
    throw new Error(`Lemon Squeezy subscription fetch failed (${res.status}): ${text}`);
  }

  const json = (await res.json()) as {
    data: {
      attributes: {
        status: string;
        variant_id: number;
        renews_at: string | null;
        ends_at: string | null;
        trial_ends_at: string | null;
        card_brand: string | null;
        card_last_four: string | null;
        urls?: { customer_portal?: string | null; update_payment_method?: string | null };
      };
    };
  };
  const a = json.data.attributes;
  return {
    status: a.status,
    variantId: String(a.variant_id),
    renewsAt: a.renews_at,
    endsAt: a.ends_at,
    trialEndsAt: a.trial_ends_at,
    cardBrand: a.card_brand,
    cardLastFour: a.card_last_four,
    customerPortalUrl: a.urls?.customer_portal ?? null,
    updatePaymentMethodUrl: a.urls?.update_payment_method ?? null,
  };
}

// Lemon Squeezy signs each webhook body with HMAC-SHA256 using the signing
// secret configured for that webhook endpoint, sent in the X-Signature header.
export function verifyWebhookSignature(rawBody: Buffer, signatureHeader: string | undefined): boolean {
  const secret = process.env.LEMONSQUEEZY_WEBHOOK_SECRET;
  if (!secret || !signatureHeader) return false;

  const digest = Buffer.from(crypto.createHmac('sha256', secret).update(rawBody).digest('hex'), 'utf8');
  const signature = Buffer.from(signatureHeader, 'utf8');

  if (digest.length !== signature.length) return false;
  return crypto.timingSafeEqual(digest, signature);
}
