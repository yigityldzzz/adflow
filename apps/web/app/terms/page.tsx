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
        <p className="text-sm text-[#94a3b8] mb-12">Last updated: August 12, 2026</p>

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
            </ul>
          </section>

          <section>
            <h2 className="text-xl font-bold text-[#0f172a] mb-3">4. Plans and current status</h2>
            <p>
              AdFlow currently offers a Free plan with the limits shown on our pricing page (tracking links,
              campaigns, and monthly click volume). Paid Pro and Team plans are in development and marked
              &ldquo;Coming Soon&rdquo; — no payment is currently collected for them, and pricing/features may change
              before launch. We will give notice before any paid plan becomes chargeable.
            </p>
          </section>

          <section>
            <h2 className="text-xl font-bold text-[#0f172a] mb-3">5. Acceptable use</h2>
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
            <h2 className="text-xl font-bold text-[#0f172a] mb-3">6. Your data</h2>
            <p>
              You retain ownership of the campaign, link, and visitor data you generate through AdFlow. Our handling
              of that data is described in our <Link href="/privacy" className="text-[#6366f1] hover:underline">Privacy Policy</Link>.
              You are responsible for the legality of the traffic and destinations you track.
            </p>
          </section>

          <section>
            <h2 className="text-xl font-bold text-[#0f172a] mb-3">7. Service availability</h2>
            <p>
              AdFlow is an actively developed product. We do not currently guarantee a specific uptime SLA. We aim
              for high availability and will communicate planned maintenance where practical, but the service is
              provided &ldquo;as is&rdquo; and &ldquo;as available&rdquo; during this stage of development.
            </p>
          </section>

          <section>
            <h2 className="text-xl font-bold text-[#0f172a] mb-3">8. Limitation of liability</h2>
            <p>
              To the maximum extent permitted by law, Digital Ad Expert shall not be liable for indirect,
              incidental, or consequential damages (including lost profits or lost advertising spend) arising from
              your use of AdFlow. Nothing in these Terms limits liability that cannot be excluded under applicable
              law (e.g. for gross negligence, willful misconduct, or statutory data-protection liability).
            </p>
          </section>

          <section>
            <h2 className="text-xl font-bold text-[#0f172a] mb-3">9. Termination</h2>
            <p>
              You may stop using AdFlow and request deletion of your account at any time by contacting{' '}
              <a href="mailto:info@digitaladexpert.de" className="text-[#6366f1] hover:underline">info@digitaladexpert.de</a>.
              We may suspend or terminate accounts that violate these Terms or applicable law.
            </p>
          </section>

          <section>
            <h2 className="text-xl font-bold text-[#0f172a] mb-3">10. Changes to these Terms</h2>
            <p>
              We may update these Terms as the product evolves. Continued use of AdFlow after an update constitutes
              acceptance of the revised Terms. Material changes will be reflected by updating the &ldquo;Last
              updated&rdquo; date above.
            </p>
          </section>

          <section>
            <h2 className="text-xl font-bold text-[#0f172a] mb-3">11. Governing law</h2>
            <p>
              These Terms are governed by the laws of Germany, without regard to its conflict-of-law provisions,
              unless mandatory consumer-protection law in your country of residence provides otherwise.
            </p>
          </section>

          <section>
            <h2 className="text-xl font-bold text-[#0f172a] mb-3">12. Contact</h2>
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
