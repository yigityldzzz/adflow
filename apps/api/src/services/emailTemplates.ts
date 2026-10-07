import { webBaseUrl } from '../config/urls';
import type { MailContent } from './mailer';

// Transactional email templates. Table-based layout with inline styles —
// the only thing that renders consistently across Gmail, Outlook and Apple Mail.

const SUPPORT_EMAIL = 'info@digitaladexpert.de';

function esc(s: string): string {
  return s
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;')
    .replace(/'/g, '&#39;');
}

function firstName(name: string | null | undefined): string {
  const first = (name ?? '').trim().split(/\s+/)[0];
  return first || 'there';
}

function formatDate(d: Date): string {
  return d.toLocaleDateString('en-GB', { day: 'numeric', month: 'long', year: 'numeric', timeZone: 'UTC' });
}

function button(href: string, label: string): string {
  return `<table role="presentation" cellpadding="0" cellspacing="0" border="0" style="margin:28px 0 8px">
  <tr><td style="border-radius:10px;background:#6366f1">
    <a href="${esc(href)}" style="display:inline-block;padding:13px 26px;font-size:15px;font-weight:600;color:#ffffff;text-decoration:none;border-radius:10px">${esc(label)}</a>
  </td></tr>
</table>`;
}

function layout(opts: { preheader: string; bodyHtml: string; footerNote: string }): string {
  return `<!doctype html>
<html lang="en">
<head>
<meta charset="utf-8">
<meta name="viewport" content="width=device-width,initial-scale=1">
<meta name="color-scheme" content="light">
<title>AdFlow</title>
</head>
<body style="margin:0;padding:0;background:#f1f5f9;font-family:-apple-system,BlinkMacSystemFont,'Segoe UI',Roboto,Helvetica,Arial,sans-serif;color:#0f172a">
<div style="display:none;max-height:0;overflow:hidden;opacity:0">${esc(opts.preheader)}</div>
<table role="presentation" width="100%" cellpadding="0" cellspacing="0" border="0" style="background:#f1f5f9">
  <tr><td align="center" style="padding:32px 16px">
    <table role="presentation" width="100%" cellpadding="0" cellspacing="0" border="0" style="max-width:560px">
      <tr><td style="padding:0 4px 20px">
        <table role="presentation" cellpadding="0" cellspacing="0" border="0"><tr>
          <td style="width:36px;height:36px;border-radius:10px;background:#6366f1;background-image:linear-gradient(135deg,#6366f1,#8b5cf6);text-align:center;vertical-align:middle;color:#ffffff;font-size:18px;font-weight:700">A</td>
          <td style="padding-left:10px;font-size:20px;font-weight:700;color:#0f172a;letter-spacing:-0.3px">Ad<span style="color:#6366f1">Flow</span></td>
        </tr></table>
      </td></tr>
      <tr><td style="background:#ffffff;border:1px solid #e2e8f0;border-radius:16px;padding:36px 32px;font-size:15px;line-height:1.6;color:#334155">
        ${opts.bodyHtml}
      </td></tr>
      <tr><td style="padding:20px 8px 0;font-size:12px;line-height:1.6;color:#94a3b8;text-align:center">
        ${esc(opts.footerNote)}<br>
        AdFlow by Digital Ad Expert · <a href="mailto:${SUPPORT_EMAIL}" style="color:#94a3b8">${SUPPORT_EMAIL}</a>
      </td></tr>
    </table>
  </td></tr>
</table>
</body>
</html>`;
}

const H1 = 'margin:0 0 16px;font-size:22px;line-height:1.3;font-weight:700;color:#0f172a';
const P = 'margin:0 0 14px';
const SMALL = 'margin:18px 0 0;font-size:13px;line-height:1.6;color:#64748b';

export function welcomeEmail(user: { name?: string | null; trialEndsAt: Date }): MailContent {
  const dashboard = `${webBaseUrl()}/dashboard`;
  const billing = `${webBaseUrl()}/settings?tab=billing`;
  const ends = formatDate(user.trialEndsAt);
  const steps = [
    ['Add a traffic source', 'the ad platform you send traffic from, e.g. Meta or Google Ads.'],
    ['Create a campaign and a tracking link', 'then use that link as the destination of your ad.'],
    ['Set up conversion tracking', 'add the pixel or postback so AdFlow can attribute leads and sales to your ads.'],
  ];

  const stepsHtml = steps
    .map(
      ([title, desc], i) => `<tr>
        <td style="width:28px;vertical-align:top;padding:0 0 12px">
          <div style="width:22px;height:22px;border-radius:11px;background:#eef2ff;color:#6366f1;font-size:12px;font-weight:700;text-align:center;line-height:22px">${i + 1}</div>
        </td>
        <td style="vertical-align:top;padding:1px 0 12px 6px"><strong style="color:#0f172a">${esc(title)}</strong> — ${esc(desc)}</td>
      </tr>`,
    )
    .join('');

  const bodyHtml = `
    <h1 style="${H1}">Welcome to AdFlow, ${esc(firstName(user.name))}!</h1>
    <p style="${P}">Your account is ready and your <strong style="color:#0f172a">free 7-day Pro trial</strong> runs until <strong style="color:#0f172a">${esc(ends)}</strong>. No card needed.</p>
    <p style="${P}">Get your first data in three steps:</p>
    <table role="presentation" cellpadding="0" cellspacing="0" border="0" style="margin:4px 0 0">${stepsHtml}</table>
    ${button(dashboard, 'Open your dashboard')}
    <p style="${SMALL}">Want to keep Pro after the trial? Subscribe anytime under <a href="${esc(billing)}" style="color:#6366f1">Settings → Plan &amp; Billing</a> (€49/month, cancel anytime).<br>
    Questions or stuck somewhere? Just reply to this email — a real person reads every message.</p>`;

  const text = [
    `Welcome to AdFlow, ${firstName(user.name)}!`,
    '',
    `Your account is ready and your free 7-day Pro trial runs until ${ends}. No card needed.`,
    '',
    'Get your first data in three steps:',
    ...steps.map(([t, d], i) => `${i + 1}. ${t} — ${d}`),
    '',
    `Open your dashboard: ${dashboard}`,
    '',
    `Want to keep Pro after the trial? Subscribe anytime under Settings → Plan & Billing (€49/month, cancel anytime): ${billing}`,
    'Questions? Just reply to this email.',
    '',
    '— AdFlow by Digital Ad Expert',
  ].join('\n');

  return {
    subject: 'Welcome to AdFlow — your 7-day Pro trial has started',
    html: layout({
      preheader: `Your free Pro trial runs until ${ends}. Here's how to get your first data.`,
      bodyHtml,
      footerNote: 'You received this email because you created an AdFlow account.',
    }),
    text,
  };
}

export function passwordResetEmail(user: { name?: string | null; email: string }, link: string): MailContent {
  const bodyHtml = `
    <h1 style="${H1}">Reset your password</h1>
    <p style="${P}">Hi ${esc(firstName(user.name))}, we received a request to reset the password for your AdFlow account <strong style="color:#0f172a">${esc(user.email)}</strong>.</p>
    ${button(link, 'Choose a new password')}
    <p style="${SMALL}">This link works once and expires in 1 hour.<br>
    If you didn't ask for this, you can safely ignore this email — your password won't change.</p>
    <p style="${SMALL}">Button not working? Copy this link into your browser:<br><a href="${esc(link)}" style="color:#6366f1;word-break:break-all">${esc(link)}</a></p>`;

  const text = [
    'Reset your AdFlow password',
    '',
    `Hi ${firstName(user.name)}, we received a request to reset the password for your AdFlow account ${user.email}.`,
    '',
    `Choose a new password: ${link}`,
    '',
    'This link works once and expires in 1 hour.',
    "If you didn't ask for this, you can ignore this email — your password won't change.",
  ].join('\n');

  return {
    subject: 'Reset your AdFlow password',
    html: layout({
      preheader: 'Use this link within 1 hour to choose a new password.',
      bodyHtml,
      footerNote: 'You received this email because a password reset was requested for your AdFlow account.',
    }),
    text,
  };
}

export function passwordChangedEmail(user: { name?: string | null; email: string }): MailContent {
  const forgot = `${webBaseUrl()}/forgot-password`;
  const bodyHtml = `
    <h1 style="${H1}">Your password was changed</h1>
    <p style="${P}">Hi ${esc(firstName(user.name))}, the password for your AdFlow account <strong style="color:#0f172a">${esc(user.email)}</strong> was just changed.</p>
    <p style="${P}">If this was you, there's nothing else to do.</p>
    <p style="${P}">If it <strong style="color:#0f172a">wasn't</strong> you, reset your password right away and reply to this email so we can help secure your account.</p>
    ${button(forgot, 'Reset my password')}`;

  const text = [
    'Your AdFlow password was changed',
    '',
    `Hi ${firstName(user.name)}, the password for your AdFlow account ${user.email} was just changed.`,
    "If this was you, there's nothing else to do.",
    `If it wasn't you, reset your password right away: ${forgot} — and reply to this email.`,
  ].join('\n');

  return {
    subject: 'Your AdFlow password was changed',
    html: layout({
      preheader: "If this wasn't you, reset your password right away.",
      bodyHtml,
      footerNote: 'You received this security notice because your AdFlow password changed.',
    }),
    text,
  };
}

// What a trial user drops back to — keep in sync with PLAN_LIMITS.FREE.
const FREE_PLAN_LIMITS = ['1 campaign', '3 tracking links', '10,000 recorded clicks per month', '30-day data retention'];

function bulletList(items: string[]): string {
  return `<ul style="margin:0 0 14px;padding-left:20px">${items.map((i) => `<li style="margin:0 0 4px">${esc(i)}</li>`).join('')}</ul>`;
}

export function trialEndingEmail(user: { name?: string | null; trialEndsAt: Date }): MailContent {
  const billing = `${webBaseUrl()}/settings?tab=billing`;
  const ends = formatDate(user.trialEndsAt);
  const daysLeft = Math.max(1, Math.ceil((user.trialEndsAt.getTime() - Date.now()) / 86400000));
  const when = daysLeft === 1 ? 'tomorrow' : `in ${daysLeft} days`;

  const bodyHtml = `
    <h1 style="${H1}">Your Pro trial ends ${esc(when)}</h1>
    <p style="${P}">Hi ${esc(firstName(user.name))}, your free AdFlow Pro trial ends on <strong style="color:#0f172a">${esc(ends)}</strong>. After that your account moves to the Free plan:</p>
    ${bulletList(FREE_PLAN_LIMITS)}
    <p style="${P}">Your tracking links keep redirecting either way — nothing breaks in your running ads. To keep unlimited campaigns, links and clicks, subscribe to Pro for <strong style="color:#0f172a">€49/month</strong>.</p>
    ${button(billing, 'Keep Pro')}
    <p style="${SMALL}">Checkout includes a 7-day free trial, so you're only charged after it ends — and you can cancel anytime before that.<br>
    Questions? Just reply to this email.</p>`;

  const text = [
    `Your AdFlow Pro trial ends ${when}`,
    '',
    `Hi ${firstName(user.name)}, your free AdFlow Pro trial ends on ${ends}. After that your account moves to the Free plan:`,
    ...FREE_PLAN_LIMITS.map((l) => `- ${l}`),
    '',
    'Your tracking links keep redirecting either way. To keep unlimited campaigns, links and clicks, subscribe to Pro for €49/month:',
    billing,
    '',
    "Checkout includes a 7-day free trial, so you're only charged after it ends — cancel anytime before that.",
  ].join('\n');

  return {
    subject: `Your AdFlow Pro trial ends ${when}`,
    html: layout({
      preheader: `Your trial ends on ${ends}. Keep Pro for €49/month — cancel anytime.`,
      bodyHtml,
      footerNote: 'You received this email because your AdFlow Pro trial is ending.',
    }),
    text,
  };
}

export function trialEndedEmail(user: { name?: string | null }): MailContent {
  const billing = `${webBaseUrl()}/settings?tab=billing`;
  const bodyHtml = `
    <h1 style="${H1}">Your Pro trial has ended</h1>
    <p style="${P}">Hi ${esc(firstName(user.name))}, thanks for trying AdFlow Pro. Your account is now on the Free plan:</p>
    ${bulletList(FREE_PLAN_LIMITS)}
    <p style="${P}">Your tracking links still redirect and your data is kept within the Free plan's limits. Upgrade anytime to get unlimited campaigns, links and clicks back.</p>
    ${button(billing, 'Upgrade to Pro — €49/month')}
    <p style="${SMALL}">Not the right fit yet? We'd love to know why — just reply to this email.</p>`;

  const text = [
    'Your AdFlow Pro trial has ended',
    '',
    `Hi ${firstName(user.name)}, thanks for trying AdFlow Pro. Your account is now on the Free plan:`,
    ...FREE_PLAN_LIMITS.map((l) => `- ${l}`),
    '',
    `Your tracking links still redirect. Upgrade anytime: ${billing}`,
    "Not the right fit yet? Reply to this email and tell us why.",
  ].join('\n');

  return {
    subject: 'Your AdFlow Pro trial has ended',
    html: layout({
      preheader: "You're on the Free plan now — upgrade anytime to get Pro back.",
      bodyHtml,
      footerNote: 'You received this email because your AdFlow Pro trial ended.',
    }),
    text,
  };
}
