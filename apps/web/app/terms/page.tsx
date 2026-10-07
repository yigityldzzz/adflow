import Link from 'next/link';
import { Activity, ArrowLeft } from 'lucide-react';

export const metadata = {
  title: 'Terms of Service — AdFlow',
  description: 'The terms that govern your use of AdFlow.',
};

export default function TermsOfServicePage() {
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
        <h1 className="text-3xl sm:text-4xl font-extrabold mb-2">Terms of Service</h1>
        <p className="text-sm text-[#94a3b8] mb-12">Last updated: October 7, 2026</p>

        <div className="prose-custom space-y-10 text-[#334155] leading-relaxed">
          <section>
            <h2 className="text-xl font-bold text-[#0f172a] mb-3">1. Agreement</h2>
            <p>
              These Terms of Service (&ldquo;Terms&rdquo;) govern your access to and use of AdFlow, a product
              operated by Digital Ad Expert (&ldquo;we&rdquo;, &ldquo;us&rdquo;). By creating an account or using
              AdFlow, you agree to these Terms. If you do not agree, do not use the service.
            </p>
          </section>

          <section>
            <h2 className="text-xl font-bold text-[#0f172a] mb-3">2. What AdFlow is</h2>
            <p>
              AdFlow is a self-hosted click-tracking and campaign-attribution platform for performance marketers. It
              generates tracking links, records click and conversion events, and provides analytics, alerting, and
              flow-routing features described on our website.
            </p>
          </section>

          <section>
            <h2 className="text-xl font-bold text-[#0f172a] mb-3">3. Your account</h2>
            <ul className="list-disc pl-5 space-y-1.5">
              <li>You must provide accurate information when registering and keep your credentials confidential.</li>
              <li>You are responsible for all activity that happens under your account and API key.</li>
              <li>You must notify us promptly of any unauthorized use of your account.</li>
              <li>We send service emails to the address on your account (for example welcome, trial and billing
                reminders, password resets and security notices). They are part of the service, not marketing.</li>
              <li>To answer a support request or fix a technical or security problem, our team may view your dashboard
                as you see it, only for that purpose (see our Privacy Policy).</li>
            </ul>
          </section>

          <section>
            <h2 className="text-xl font-bold text-[#0f172a] mb-3">4. Plans, payment and billing</h2>
            <p>
              AdFlow&rsquo;s Free plan is available with the limits shown on our pricing page. Every new account
              starts with a 7-day trial of Pro features, no credit card required; if you do not subscribe before the
              trial ends, your account automatically returns to the Free plan. Paid plans are billed monthly:
              Pro &euro;49/month and Team &euro;149/month. A subscription started at checkout includes a 7-day free
              trial: you are charged when it ends unless you cancel before. Depending on your location, VAT or sales
              tax may be added at checkout.
            </p>
            <p className="mt-2">
              Our order process is conducted by our online reseller Lemon Squeezy, who is the Merchant of Record for
              all paid orders. Lemon Squeezy handles payment processing, invoices, sales tax and billing-related
              customer service. Subscriptions renew automatically each month until cancelled.
            </p>
          </section>

          <section id="refunds" className="scroll-mt-24">
            <h2 className="text-xl font-bold text-[#0f172a] mb-3">5. Cancellation and refunds</h2>
            <ul className="list-disc pl-5 space-y-1.5">
              <li>You can cancel your subscription at any time from your billing settings or by emailing us. Your paid
                features remain active until the end of the current billing period; you will not be charged again.</li>
              <li>If AdFlow is not right for you, you can request a full refund within 7 days of your first payment
                for a paid plan by emailing{ }
                <a href="mailto:info@digitaladexpert.de" className="text-[#6366f1] hover:underline">info@digitaladexpert.de</a>.</li>
              <li>Renewal payments are not refunded, except where required by law or in case of a billing error.</li>
              <li>Nothing in this section limits any statutory rights you have as a consumer under the law of your
                country of residence.</li>
            </ul>
          </section>

          <section>
            <h2 className="text-xl font-bold text-[#0f172a] mb-3">6. Acceptable use</h2>
            <p>You agree not to use AdFlow to:</p>
            <ul className="list-disc pl-5 space-y-1.5 mt-2">
              <li>Track individuals without a lawful basis under applicable data protection law (e.g. GDPR);</li>
              <li>Send fraudulent, deceptive, or unsolicited traffic, or engage in click fraud;</li>
              <li>Promote illegal products/services, malware, or content that infringes third-party rights;</li>
              <li>Attempt to probe, scan, or breach the security of our infrastructure;</li>
              <li>Resell or sublicense the service without our written consent.</li>
            </ul>
            <p className="mt-2">
              We may suspend or terminate accounts that violate this section, with or without notice, depending on
              severity.
            </p>
          </section>

          <section>
            <h2 className="text-xl font-bold text-[#0f172a] mb-3">7. Your data</h2>
            <p>
              You retain ownership of the campaign, link, and visitor data you generate through AdFlow. Our handling
              of that data is described in our <Link href="/privacy" className="text-[#6366f1] hover:underline">Privacy Policy</Link>.
              You are responsible for the legality of the traffic and destinations you track.
            </p>
          </section>

          <section>
            <h2 className="text-xl font-bold text-[#0f172a] mb-3">8. Service availability</h2>
            <p>
              AdFlow is an actively developed product. We do not currently guarantee a specific uptime SLA. We aim
              for high availability and will communicate planned maintenance where practical, but the service is
              provided &ldquo;as is&rdquo; and &ldquo;as available&rdquo; during this stage of development.
            </p>
          </section>

          <section>
            <h2 className="text-xl font-bold text-[#0f172a] mb-3">9. Limitation of liability</h2>
            <p>
              To the maximum extent permitted by law, Digital Ad Expert shall not be liable for indirect,
              incidental, or consequential damages (including lost profits or lost advertising spend) arising from
              your use of AdFlow. Nothing in these Terms limits liability that cannot be excluded under applicable
              law (e.g. for gross negligence, willful misconduct, or statutory data-protection liability).
            </p>
          </section>

          <section>
            <h2 className="text-xl font-bold text-[#0f172a] mb-3">10. Termination</h2>
            <p>
              You may stop using AdFlow and request deletion of your account at any time by contacting{' '}
              <a href="mailto:info@digitaladexpert.de" className="text-[#6366f1] hover:underline">info@digitaladexpert.de</a>.
              We may suspend or terminate accounts that violate these Terms or applicable law.
            </p>
          </section>

          <section>
            <h2 className="text-xl font-bold text-[#0f172a] mb-3">11. Changes to these Terms</h2>
            <p>
              We may update these Terms as the product evolves. Continued use of AdFlow after an update constitutes
              acceptance of the revised Terms. Material changes will be reflected by updating the &ldquo;Last
              updated&rdquo; date above.
            </p>
          </section>

          <section>
            <h2 className="text-xl font-bold text-[#0f172a] mb-3">12. Governing law</h2>
            <p>
              These Terms are governed by the laws of Albania, where the service operator is registered, without
              regard to its conflict-of-law provisions, unless mandatory consumer-protection law in your country of
              residence provides otherwise.
            </p>
          </section>

          <section>
            <h2 className="text-xl font-bold text-[#0f172a] mb-3">13. Contact</h2>
            <p>
              Questions about these Terms? Reach us at{' '}
              <a href="mailto:info@digitaladexpert.de" className="text-[#6366f1] hover:underline">info@digitaladexpert.de</a>.
            </p>
          </section>
        </div>
      </main>
    </div>
  );
}
