import Link from 'next/link';
import { Activity, ArrowLeft } from 'lucide-react';

export const metadata = {
  title: 'Privacy Policy — AdFlow',
  description: 'How AdFlow collects, uses, and protects data.',
};

export default function PrivacyPolicyPage() {
  return (
    <div className="min-h-screen bg-[#f8fafc] text-[#0f172a]">
      <header className="border-b border-[#e2e8f0] bg-[#ffffff]">
        <div className="max-w-3xl mx-auto px-4 sm:px-6 py-5 flex items-center justify-between">
          <Link href="/" className="flex items-center gap-2">
            <div className="w-7 h-7 rounded-lg bg-gradient-to-br from-[#6366f1] to-[#8b5cf6] flex items-center justify-center">
              <Activity className="w-3.5 h-3.5 text-white" />
            </div>
            <span className="text-base font-bold text-[#0f172a]">
              Ad<span className="gradient-text">Flow</span>
            </span>
          </Link>
          <Link href="/" className="inline-flex items-center gap-1.5 text-sm text-[#64748b] hover:text-[#0f172a] transition-colors">
            <ArrowLeft className="w-4 h-4" />
            Back to home
          </Link>
        </div>
      </header>

      <main className="max-w-3xl mx-auto px-4 sm:px-6 py-16">
        <h1 className="text-3xl sm:text-4xl font-extrabold mb-2">Privacy Policy</h1>
        <p className="text-sm text-[#94a3b8] mb-12">Last updated: August 12, 2026</p>

        <div className="prose-custom space-y-10 text-[#334155] leading-relaxed">
          <section>
            <h2 className="text-xl font-bold text-[#0f172a] mb-3">1. Who we are</h2>
            <p>
              AdFlow is operated by Digital Ad Expert (&ldquo;we&rdquo;, &ldquo;us&rdquo;, &ldquo;our&rdquo;), the data
              controller for account data described below. For questions about this policy or to exercise your data
              protection rights, contact us at{' '}
              <a href="mailto:info@digitaladexpert.de" className="text-[#6366f1] hover:underline">info@digitaladexpert.de</a>.
            </p>
            <p className="mt-2 text-sm text-[#94a3b8]">
              Digital Ad Expert is operated by Yiğit Yıldız, a sole proprietor (Person Fizik) registered with the
              Albanian National Business Center (Qendra Kombëtare e Biznesit), business registration number (NUIS)
              M61404014A. Registered address: Rruga Astrit Losha, Pallati Marituda, Tiranë, Albania.
            </p>
          </section>

          <section>
            <h2 className="text-xl font-bold text-[#0f172a] mb-3">2. Two roles: controller and processor</h2>
            <p>
              AdFlow is a click-tracking and campaign-attribution tool. When you create an AdFlow account, we act as
              <strong> data controller</strong> for your account data (email, name, password hash, billing plan).
            </p>
            <p className="mt-2">
              When your tracking links capture data about the visitors who click your ads (IP address, device,
              location, click identifiers), <strong>you</strong> are the data controller for that visitor data, and
              AdFlow acts as your <strong>data processor</strong>. You are responsible for ensuring you have a valid
              legal basis (e.g. consent or legitimate interest, in line with GDPR and the ePrivacy Directive) to
              track your own visitors, and for your own privacy notices to them. A data processing agreement (DPA) is
              available on request.
            </p>
          </section>

          <section>
            <h2 className="text-xl font-bold text-[#0f172a] mb-3">3. What data we collect</h2>
            <ul className="list-disc pl-5 space-y-1.5">
              <li><strong>Account data:</strong> name, email address, hashed password (never stored in plain text), plan/role.</li>
              <li><strong>Click data (processed on your behalf):</strong> IP address, approximate geolocation derived from IP, device/browser user agent, referrer URL, UTM parameters, and ad-platform click identifiers (e.g. fbclid, gclid, ttclid) present in the URL.</li>
              <li><strong>Conversion data:</strong> events you or your ad platform send back to us via postback URL, pixel, or the Meta Conversions API integration.</li>
              <li><strong>Technical/log data:</strong> request logs used for security, abuse prevention, and bot filtering.</li>
            </ul>
          </section>

          <section>
            <h2 className="text-xl font-bold text-[#0f172a] mb-3">4. Legal basis for processing</h2>
            <p>
              Account data is processed under Art. 6(1)(b) GDPR (performance of a contract with you). Click and
              conversion data is processed on your instructions as our customer, under Art. 6(1)(f) GDPR (legitimate
              interest in operating the service you configured) or the legal basis you establish with your own
              visitors.
            </p>
          </section>

          <section>
            <h2 className="text-xl font-bold text-[#0f172a] mb-3">5. Data retention</h2>
            <p>
              Click and conversion data is retained according to your plan&apos;s stated retention window (currently
              30 days on the Free plan; longer retention is planned for paid tiers). Account data is retained for as
              long as your account is active, and deleted upon account deletion request, subject to any legal
              retention obligations.
            </p>
          </section>

          <section>
            <h2 className="text-xl font-bold text-[#0f172a] mb-3">6. Where your data is processed</h2>
            <p>
              AdFlow is self-hosted on infrastructure we operate and control directly — we do not sell or share your
              data with data brokers or advertising networks beyond the integrations you explicitly configure (for
              example, sending conversion events to Meta via the Conversions API when you enable that feature).
            </p>
          </section>

          <section>
            <h2 className="text-xl font-bold text-[#0f172a] mb-3">7. Security</h2>
            <p>
              We use industry-standard measures to protect data in transit (TLS/HTTPS) and at rest, including
              hashed credentials (bcrypt), access-controlled infrastructure, firewalling, and intrusion
              prevention on our servers. No system is 100% secure, and we continuously work to improve our
              security posture.
            </p>
          </section>

          <section>
            <h2 className="text-xl font-bold text-[#0f172a] mb-3">8. Your rights (GDPR)</h2>
            <p>If you are located in the EU/EEA or UK, you have the right to:</p>
            <ul className="list-disc pl-5 space-y-1.5 mt-2">
              <li>Access the personal data we hold about you</li>
              <li>Request correction of inaccurate data</li>
              <li>Request deletion of your data (&ldquo;right to be forgotten&rdquo;)</li>
              <li>Restrict or object to certain processing</li>
              <li>Request a portable copy of your data</li>
              <li>Lodge a complaint with your local data protection supervisory authority</li>
            </ul>
            <p className="mt-2">
              To exercise any of these rights, email{' '}
              <a href="mailto:info@digitaladexpert.de" className="text-[#6366f1] hover:underline">info@digitaladexpert.de</a>.
            </p>
          </section>

          <section>
            <h2 className="text-xl font-bold text-[#0f172a] mb-3">9. Cookies</h2>
            <p>
              The AdFlow dashboard uses a single essential authentication cookie/token to keep you signed in. It
              does not set third-party advertising or tracking cookies on this website. Tracking links you create
              in AdFlow may set identifiers on your own destination pages as part of the attribution feature you
              configured — that data belongs to you as controller, as described in Section 2.
            </p>
          </section>

          <section>
            <h2 className="text-xl font-bold text-[#0f172a] mb-3">10. Changes to this policy</h2>
            <p>
              We may update this policy as the product evolves. Material changes will be reflected by updating the
              &ldquo;Last updated&rdquo; date above.
            </p>
          </section>
        </div>
      </main>
    </div>
  );
}
