// Public origin of the dashboard (Next.js app), used for links we hand out:
// checkout return URLs, password-reset links, email buttons.
export function webBaseUrl(): string {
  return (process.env.WEB_BASE_URL ?? 'https://adflow.digitaladexpert.de').replace(/\/+$/, '');
}
