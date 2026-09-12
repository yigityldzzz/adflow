'use client';

import Link from 'next/link';
import Image from 'next/image';
import { useState, useEffect, useRef } from 'react';
import {
  Zap,
  Target,
  Bot,
  Shield,
  BarChart3,
  Link2,
  ArrowRight,
  Check,
  ChevronRight,
  Activity,
  Globe,
  TrendingUp,
  MousePointerClick,
  Menu,
  X,
  Wrench,
  FileText,
  Bell,
  Download,
} from 'lucide-react';

const NAV_LINKS = [
  { label: 'Features', href: '#features' },
  { label: 'Pricing', href: '#pricing' },
];

const FEATURES = [
  {
    icon: <Zap className="w-6 h-6" />,
    title: 'Instant Redirect Tracking',
    description:
      'Sub-50ms redirect latency ensures seamless user experience while capturing every click with full attribution data.',
    color: 'from-yellow-500/20 to-orange-500/20',
    iconColor: 'text-yellow-400',
  },
  {
    icon: <Target className="w-6 h-6" />,
    title: 'Precise Click Attribution',
    description:
      'Every conversion is linked back to its originating click — full visitor data, UTM parameters, and click IDs (fbclid, gclid, ttclid) captured automatically.',
    color: 'from-indigo-500/20 to-blue-500/20',
    iconColor: 'text-indigo-400',
  },
  {
    icon: <Bot className="w-6 h-6" />,
    title: 'Automated Performance Alerts',
    description:
      'Automatic detection of ad fatigue, CPA spikes, and traffic anomalies — surfaced as clear alerts so you catch problems before they cost you.',
    color: 'from-violet-500/20 to-purple-500/20',
    iconColor: 'text-violet-400',
  },
  {
    icon: <Shield className="w-6 h-6" />,
    title: 'Bot & Fraud Detection',
    description:
      'Advanced fingerprinting and behavioral analysis filter out bot traffic, saving your budget for real potential customers.',
    color: 'from-red-500/20 to-pink-500/20',
    iconColor: 'text-red-400',
  },
  {
    icon: <BarChart3 className="w-6 h-6" />,
    title: 'Real-Time Analytics',
    description:
      'Live dashboards with second-by-second click data, conversion funnels, and performance metrics across all campaigns.',
    color: 'from-green-500/20 to-emerald-500/20',
    iconColor: 'text-emerald-400',
  },
  {
    icon: <Link2 className="w-6 h-6" />,
    title: 'Conversion Postbacks',
    description:
      'Server-to-server postback URLs enable accurate conversion tracking even with iOS privacy changes and ad blockers.',
    color: 'from-cyan-500/20 to-teal-500/20',
    iconColor: 'text-cyan-400',
  },
  {
    icon: <Wrench className="w-6 h-6" />,
    title: 'UTM Builder',
    description:
      'Build UTM-tagged tracking URLs in seconds with one-click presets for Meta, Google, TikTok and email campaigns.',
    color: 'from-orange-500/20 to-amber-500/20',
    iconColor: 'text-orange-400',
  },
  {
    icon: <FileText className="w-6 h-6" />,
    title: 'Reports & CSV Export',
    description:
      'Generate campaign performance reports with daily breakdowns and export raw click data to CSV with one click.',
    color: 'from-sky-500/20 to-blue-500/20',
    iconColor: 'text-sky-400',
  },
  {
    icon: <Bell className="w-6 h-6" />,
    title: 'Smart Alerts',
    description:
      'Set threshold rules on clicks, conversions, revenue or bot rate. Get instantly notified when something looks off.',
    color: 'from-rose-500/20 to-pink-500/20',
    iconColor: 'text-rose-400',
  },
];

const STEPS = [
  {
    number: '01',
    title: 'Create a Tracking Link',
    description:
      'Generate a unique tracking URL for your Meta ad campaign. Set your destination URL, assign a campaign, and configure attribution rules.',
  },
  {
    number: '02',
    title: 'Deploy & Monitor',
    description:
      'Replace your ad destination URL with the AdFlow tracking link. Every click is captured in real-time with full visitor data and UTM parameters.',
  },
  {
    number: '03',
    title: 'Spot Problems Early',
    description:
      'Automated alerts flag ad fatigue, cost spikes, and unusual bot activity — so you can act before they eat into your ROAS.',
  },
];

const PLANS = [
  {
    name: 'Free',
    price: '$0',
    period: '/month',
    description: 'Perfect for testing and small campaigns',
    featuresIntro: null as string | null,
    features: [
      '10,000 clicks/month',
      '3 tracking links',
      '1 campaign',
      'Basic analytics',
      '30-day data retention',
      'Community support',
    ],
    cta: 'Get Started Free',
    highlighted: false,
    badge: null as string | null,
    comingSoon: false,
  },
  {
    name: 'Pro',
    price: '$49',
    period: '/month',
    description: 'For serious performance marketers',
    featuresIntro: 'Everything in Free, plus:' as string | null,
    features: [
      'Unlimited clicks & tracking links',
      'Unlimited campaigns',
      'AI insights & anomaly detection',
      'Conversion postbacks',
      'Bot detection',
      '1-year data retention',
      'Priority email support',
    ],
    cta: 'Start 7-Day Free Trial',
    highlighted: true,
    badge: 'Most Popular' as string | null,
    comingSoon: false,
  },
  {
    name: 'Team',
    price: '$149',
    period: '/month',
    description: 'For agencies and large teams',
    featuresIntro: 'Everything in Pro, plus:' as string | null,
    features: [
      'Multi-user access & permissions',
      'Custom attribution windows',
      'White-label reports',
      'API access',
      'Unlimited data retention',
      'Dedicated Slack support',
    ],
    cta: 'Start 7-Day Free Trial',
    highlighted: false,
    badge: null as string | null,
    comingSoon: false,
  },
];

const SHOWCASE_TABS = [
  { id: 'analytics', label: 'Analytics' },
  { id: 'campaigns', label: 'Campaigns' },
  { id: 'links', label: 'Link Detail' },
  { id: 'utm', label: 'UTM Builder' },
  { id: 'alerts', label: 'Smart Alerts' },
];

const SHOWCASE_IMAGES: Record<string, { src: string; alt: string; path: string }> = {
  analytics: { src: '/screenshots/analytics.png', alt: 'AdFlow analytics dashboard', path: 'adflow.digitaladexpert.de/analytics' },
  campaigns: { src: '/screenshots/campaigns.png', alt: 'AdFlow campaigns list', path: 'adflow.digitaladexpert.de/campaigns' },
  links: { src: '/screenshots/links.png', alt: 'AdFlow tracking links', path: 'adflow.digitaladexpert.de/links' },
  utm: { src: '/screenshots/utm-builder.png', alt: 'AdFlow UTM builder', path: 'adflow.digitaladexpert.de/utm-builder' },
  alerts: { src: '/screenshots/alerts.png', alt: 'AdFlow smart alerts', path: 'adflow.digitaladexpert.de/alerts' },
};

const DEMO_URL = 'https://adflow.digitaladexpert.de/r/site-adflow-demo';

const STATS = [
  { value: 'Self-Hosted', label: 'Your Infrastructure', icon: <MousePointerClick className="w-5 h-5" /> },
  { value: 'S2S + Pixel', label: 'Dual Conversion Tracking', icon: <Activity className="w-5 h-5" /> },
  { value: 'Meta CAPI', label: 'Native Integration', icon: <Zap className="w-5 h-5" /> },
  { value: 'Real-Time', label: 'Click-Level Data', icon: <Globe className="w-5 h-5" /> },
];

export default function LandingPage() {
  const [mobileMenuOpen, setMobileMenuOpen] = useState(false);
  const [showcaseTab, setShowcaseTab] = useState('analytics');

  // Container-scroll effect on the hero screenshot (same technique used on
  // the CRM panel's marketing page): rotates/scales down from a 3D tilt to
  // flat as the section scrolls past, then stays flat.
  const heroCardRef = useRef<HTMLDivElement>(null);
  const heroWrapRef = useRef<HTMLDivElement>(null);
  useEffect(() => {
    const reduceMotion = window.matchMedia('(prefers-reduced-motion: reduce)').matches;
    if (reduceMotion) return;
    let raf = 0;
    const tick = () => {
      const card = heroCardRef.current;
      const wrap = heroWrapRef.current;
      if (card && wrap) {
        const rect = wrap.getBoundingClientRect();
        const y = window.scrollY || window.pageYOffset;
        const p = Math.min(1, Math.max(0, y / ((rect.top + y) + rect.height * 0.45)));
        const mobile = window.innerWidth < 768;
        const rot = 14 - 14 * p;
        const scale = mobile ? 0.85 + 0.15 * p : 0.97 + 0.03 * p;
        card.style.transform = `perspective(1400px) rotateX(${rot}deg) scale(${scale})`;
      }
      raf = 0;
    };
    const onScroll = () => { if (!raf) raf = requestAnimationFrame(tick); };
    tick();
    window.addEventListener('scroll', onScroll, { passive: true });
    window.addEventListener('resize', onScroll);
    return () => {
      window.removeEventListener('scroll', onScroll);
      window.removeEventListener('resize', onScroll);
      if (raf) cancelAnimationFrame(raf);
    };
  }, []);

  return (
    <div className="min-h-screen bg-[#f8fafc] text-[#0f172a]">
      {/* Navigation */}
      <header className="fixed top-0 left-0 right-0 z-50 glass border-b border-[#e2e8f0]">
        <nav className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 h-16 flex items-center justify-between">
          {/* Logo */}
          <Link href="/" className="flex items-center gap-2">
            <div className="w-8 h-8 rounded-lg bg-gradient-to-br from-[#6366f1] to-[#8b5cf6] flex items-center justify-center shadow-lg shadow-indigo-500/25">
              <Activity className="w-4 h-4 text-white" />
            </div>
            <span className="text-lg font-bold text-[#0f172a] tracking-tight">
              Ad<span className="gradient-text">Flow</span>
            </span>
          </Link>

          {/* Desktop Nav */}
          <div className="hidden md:flex items-center gap-8">
            {NAV_LINKS.map((link) => (
              <a
                key={link.label}
                href={link.href}
                className="text-sm text-[#64748b] hover:text-[#0f172a] transition-colors"
              >
                {link.label}
              </a>
            ))}
          </div>

          {/* CTA buttons */}
          <div className="hidden md:flex items-center gap-3">
            <Link
              href="/login"
              className="text-sm text-[#64748b] hover:text-[#0f172a] transition-colors px-3 py-1.5"
            >
              Sign In
            </Link>
            <Link
              href="/register"
              className="text-sm font-medium bg-[#6366f1] hover:bg-[#5558e3] text-white px-4 py-1.5 rounded-lg transition-colors"
            >
              Get Started →
            </Link>
          </div>

          {/* Mobile menu toggle */}
          <button
            onClick={() => setMobileMenuOpen(!mobileMenuOpen)}
            className="md:hidden text-[#64748b] hover:text-white"
          >
            {mobileMenuOpen ? <X className="w-6 h-6" /> : <Menu className="w-6 h-6" />}
          </button>
        </nav>

        {/* Mobile menu */}
        {mobileMenuOpen && (
          <div className="md:hidden border-t border-[#e2e8f0] bg-[#f8fafc] px-4 py-4 space-y-3">
            {NAV_LINKS.map((link) => (
              <a
                key={link.label}
                href={link.href}
                className="block text-sm text-[#64748b] hover:text-white py-1"
              >
                {link.label}
              </a>
            ))}
            <div className="flex gap-3 pt-2">
              <Link href="/login" className="flex-1 text-center text-sm py-2 border border-[#e2e8f0] rounded-lg text-[#64748b]">
                Sign In
              </Link>
              <Link href="/register" className="flex-1 text-center text-sm py-2 bg-[#6366f1] text-white rounded-lg font-medium">
                Get Started
              </Link>
            </div>
          </div>
        )}
      </header>

      {/* Hero Section */}
      <section className="relative pt-32 pb-24 overflow-hidden">
        {/* Background glows */}
        <div className="absolute inset-0 overflow-hidden pointer-events-none">
          <div className="absolute -top-40 -left-40 w-96 h-96 bg-[#6366f1]/10 rounded-full blur-3xl" />
          <div className="absolute -top-20 -right-40 w-80 h-80 bg-[#8b5cf6]/10 rounded-full blur-3xl" />
          <div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-[800px] h-[800px] bg-[#6366f1]/5 rounded-full blur-3xl" />
        </div>

        <div className="relative max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 text-center">
          {/* Announcement badge */}
          <div className="inline-flex items-center gap-2 bg-[#ffffff] border border-[#e2e8f0] rounded-full px-4 py-1.5 text-sm text-[#64748b] mb-8">
            <span className="w-2 h-2 rounded-full bg-[#10b981] animate-pulse-slow" />
            New: Meta Conversions API integration
            <ChevronRight className="w-3 h-3" />
          </div>

          {/* Headline */}
          <h1 className="text-5xl sm:text-6xl lg:text-7xl font-extrabold tracking-tight leading-[1.05] mb-6">
            Track Every Click.
            <br />
            <span className="gradient-text">Understand Every</span>
            <br />
            Conversion.
          </h1>

          <p className="text-lg sm:text-xl text-[#64748b] max-w-2xl mx-auto mb-10 leading-relaxed">
            The self-hosted attribution platform for Meta Ads and performance marketers.
            Real-time analytics, server-side conversion tracking, and fraud detection in one dashboard.
          </p>

          {/* CTA buttons */}
          <div className="flex flex-col sm:flex-row gap-4 justify-center mb-16">
            <Link
              href="/register"
              className="group inline-flex items-center justify-center gap-2 bg-[#6366f1] hover:bg-[#5558e3] text-white font-semibold px-8 py-3.5 rounded-xl transition-all duration-200 shadow-lg shadow-indigo-500/25 hover:shadow-indigo-500/40 hover:-translate-y-0.5"
            >
              Start for Free
              <ArrowRight className="w-4 h-4 group-hover:translate-x-0.5 transition-transform" />
            </Link>
            <a
              href={DEMO_URL}
              target="_blank"
              rel="noopener"
              className="inline-flex items-center justify-center gap-2 bg-[#ffffff] hover:bg-[#e2e8f0] border border-[#e2e8f0] text-[#0f172a] font-semibold px-8 py-3.5 rounded-xl transition-all duration-200"
            >
              View Demo
            </a>
          </div>
          <p className="text-xs text-[#94a3b8] -mt-10 mb-16">Demo opens automatically, no password needed</p>

          {/* Real Dashboard Preview — container-scroll effect */}
          <div ref={heroWrapRef} className="relative max-w-5xl mx-auto" style={{ perspective: '1400px' }}>
            {/* Glow behind dashboard */}
            <div className="absolute inset-0 bg-gradient-to-t from-[#6366f1]/20 to-transparent rounded-2xl blur-xl" />

            <div
              ref={heroCardRef}
              className="relative bg-[#ffffff] border border-[#e2e8f0] rounded-2xl overflow-hidden shadow-2xl"
              style={{ transformOrigin: 'center top', willChange: 'transform' }}
            >
              {/* Browser chrome */}
              <div className="flex items-center gap-2 px-4 py-3 border-b border-[#e2e8f0] bg-[#f8fafc]">
                <div className="w-3 h-3 rounded-full bg-[#ef4444]/60" />
                <div className="w-3 h-3 rounded-full bg-[#f59e0b]/60" />
                <div className="w-3 h-3 rounded-full bg-[#10b981]/60" />
                <div className="flex-1 mx-4 bg-[#e2e8f0] rounded-md px-3 py-1 text-xs text-[#94a3b8]">
                  adflow.digitaladexpert.de/dashboard
                </div>
              </div>

              <Image
                src="/screenshots/dashboard.png"
                alt="AdFlow dashboard — real click, conversion, and revenue data"
                width={1440}
                height={900}
                className="w-full h-auto block"
                priority
              />
            </div>
          </div>
        </div>
      </section>

      {/* Stats Bar */}
      <section className="py-12 border-y border-[#e2e8f0] bg-[#ffffff]/50">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="grid grid-cols-2 md:grid-cols-4 gap-8">
            {STATS.map((stat) => (
              <div key={stat.label} className="text-center">
                <div className="flex items-center justify-center gap-2 mb-1">
                  <span className="text-[#6366f1]">{stat.icon}</span>
                  <span className="text-3xl font-extrabold text-[#0f172a]">{stat.value}</span>
                </div>
                <p className="text-sm text-[#94a3b8]">{stat.label}</p>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* Features Section */}
      <section id="features" className="py-24">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="text-center mb-16">
            <span className="inline-block text-xs font-semibold text-[#6366f1] uppercase tracking-widest mb-4 bg-[#6366f1]/10 px-3 py-1 rounded-full border border-[#6366f1]/20">
              Features
            </span>
            <h2 className="text-4xl font-bold text-[#0f172a] mb-4">
              Everything you need to{' '}
              <span className="gradient-text shine-text">track smarter</span>
            </h2>
            <p className="text-[#64748b] max-w-xl mx-auto">
              Built for performance marketers who need precision attribution and real-time insights to optimize every campaign.
            </p>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-5">
            {FEATURES.map((feature) => (
              <div
                key={feature.title}
                className="group relative bg-[#ffffff] border border-[#e2e8f0] rounded-2xl p-6 hover:border-[#6366f1]/40 transition-all duration-300 hover:-translate-y-0.5 hover:shadow-xl hover:shadow-indigo-500/5"
              >
                <div className={`inline-flex items-center justify-center w-12 h-12 rounded-xl bg-gradient-to-br ${feature.color} mb-4`}>
                  <span className={feature.iconColor}>{feature.icon}</span>
                </div>
                <h3 className="text-base font-semibold text-[#0f172a] mb-2">{feature.title}</h3>
                <p className="text-sm text-[#64748b] leading-relaxed">{feature.description}</p>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* How it works */}
      <section className="py-24 bg-[#ffffff]/40">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="text-center mb-16">
            <span className="inline-block text-xs font-semibold text-[#8b5cf6] uppercase tracking-widest mb-4 bg-[#8b5cf6]/10 px-3 py-1 rounded-full border border-[#8b5cf6]/20">
              How it works
            </span>
            <h2 className="text-4xl font-bold text-[#0f172a] mb-4">
              Up and running in{' '}
              <span className="gradient-text">3 minutes</span>
            </h2>
          </div>

          <div className="relative grid grid-cols-1 md:grid-cols-3 gap-8">
            {/* Connector line */}
            <div className="hidden md:block absolute top-10 left-1/3 right-1/3 h-px bg-gradient-to-r from-[#6366f1]/50 to-[#8b5cf6]/50" />

            {STEPS.map((step, i) => (
              <div key={step.number} className="relative text-center">
                <div className="relative inline-flex items-center justify-center w-20 h-20 rounded-2xl bg-gradient-to-br from-[#6366f1]/20 to-[#8b5cf6]/20 border border-[#6366f1]/30 mb-6 mx-auto">
                  <span className="text-2xl font-black gradient-text">{step.number}</span>
                </div>
                <h3 className="text-lg font-semibold text-[#0f172a] mb-3">{step.title}</h3>
                <p className="text-sm text-[#64748b] leading-relaxed max-w-xs mx-auto">{step.description}</p>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* Panel Showcase */}
      <section className="py-24 bg-[#ffffff]/40">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="text-center mb-12">
            <span className="inline-block text-xs font-semibold text-[#8b5cf6] uppercase tracking-widest mb-4 bg-[#8b5cf6]/10 px-3 py-1 rounded-full border border-[#8b5cf6]/20">
              Inside the platform
            </span>
            <h2 className="text-4xl font-bold text-[#0f172a] mb-4">
              Every tool you need,{' '}
              <span className="gradient-text">in one dashboard</span>
            </h2>
            <p className="text-[#64748b] max-w-xl mx-auto">
              From click-level visitor profiles to automated alerts — see exactly what you get when you sign up.
            </p>
          </div>

          {/* Tab switcher */}
          <div className="flex items-center justify-center gap-2 mb-8 flex-wrap">
            {SHOWCASE_TABS.map((tab) => (
              <button
                key={tab.id}
                onClick={() => setShowcaseTab(tab.id)}
                className={`px-4 py-2 rounded-xl text-sm font-medium transition-all ${
                  showcaseTab === tab.id
                    ? 'bg-[#6366f1] text-white shadow-md shadow-indigo-500/25'
                    : 'bg-[#ffffff] border border-[#e2e8f0] text-[#64748b] hover:text-[#0f172a] hover:border-[#cbd5e1]'
                }`}
              >
                {tab.label}
              </button>
            ))}
          </div>

          {/* Mockup window — real screenshots, swapped per tab */}
          <div className="relative max-w-5xl mx-auto">
            <div className="absolute inset-0 bg-gradient-to-t from-[#6366f1]/15 to-transparent rounded-2xl blur-xl" />
            <div className="relative bg-[#ffffff] border border-[#e2e8f0] rounded-2xl overflow-hidden shadow-2xl">
              {/* Browser chrome */}
              <div className="flex items-center gap-2 px-4 py-3 border-b border-[#e2e8f0] bg-[#f8fafc]">
                <div className="w-3 h-3 rounded-full bg-[#ef4444]/60" />
                <div className="w-3 h-3 rounded-full bg-[#f59e0b]/60" />
                <div className="w-3 h-3 rounded-full bg-[#10b981]/60" />
                <div className="flex-1 mx-4 bg-[#e2e8f0] rounded-md px-3 py-1 text-xs text-[#94a3b8]">
                  {SHOWCASE_IMAGES[showcaseTab].path}
                </div>
              </div>

              <Image
                key={showcaseTab}
                src={SHOWCASE_IMAGES[showcaseTab].src}
                alt={SHOWCASE_IMAGES[showcaseTab].alt}
                width={1440}
                height={900}
                className="w-full h-auto block"
              />
            </div>
          </div>
        </div>
      </section>

      {/* Pricing */}
      <section id="pricing" className="py-24">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="text-center mb-16">
            <span className="inline-block text-xs font-semibold text-[#6366f1] uppercase tracking-widest mb-4 bg-[#6366f1]/10 px-3 py-1 rounded-full border border-[#6366f1]/20">
              Pricing
            </span>
            <h2 className="text-4xl font-bold text-[#0f172a] mb-4">
              Simple, transparent pricing
            </h2>
            <p className="text-[#64748b]">
              Start free, no credit card required. Every paid plan starts with a 7-day free trial.
            </p>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-3 gap-6 max-w-5xl mx-auto">
            {PLANS.map((plan) => (
              <div
                key={plan.name}
                className={`relative flex flex-col rounded-2xl p-7 border transition-all duration-300 ${
                  plan.comingSoon
                    ? 'bg-[#ffffff] border-[#e2e8f0] opacity-80'
                    : plan.highlighted
                    ? 'bg-gradient-to-b from-[#6366f1]/10 to-[#ffffff] border-[#6366f1]/50 shadow-2xl shadow-indigo-500/10 scale-105'
                    : 'bg-[#ffffff] border-[#e2e8f0]'
                }`}
              >
                {plan.badge && (
                  <div className="absolute -top-3 left-1/2 -translate-x-1/2">
                    <span className={`text-white text-xs font-semibold px-4 py-1 rounded-full shadow-lg ${
                      plan.comingSoon
                        ? 'bg-[#94a3b8]'
                        : 'bg-gradient-to-r from-[#6366f1] to-[#8b5cf6]'
                    }`}>
                      {plan.badge}
                    </span>
                  </div>
                )}

                <div className="mb-6">
                  <h3 className="text-lg font-bold text-[#0f172a] mb-1">{plan.name}</h3>
                  <p className="text-sm text-[#64748b] mb-4">{plan.description}</p>
                  {plan.price !== null ? (
                    <div className="flex items-baseline gap-1">
                      <span className="text-4xl font-extrabold text-[#0f172a]">{plan.price}</span>
                      <span className="text-[#64748b] text-sm">{plan.period}</span>
                    </div>
                  ) : (
                    <div className="flex items-center gap-2">
                      <span className="text-sm font-medium text-[#94a3b8] bg-[#e2e8f0] px-3 py-1 rounded-lg border border-[#cbd5e1]">
                        Price TBD
                      </span>
                    </div>
                  )}
                </div>

                {plan.featuresIntro && (
                  <p className="text-xs font-semibold text-[#6366f1] uppercase tracking-wide mb-3">
                    {plan.featuresIntro}
                  </p>
                )}

                <ul className="space-y-3 flex-1 mb-7">
                  {plan.features.map((feat) => (
                    <li key={feat} className="flex items-center gap-3 text-sm text-[#64748b]">
                      <Check className={`w-4 h-4 flex-shrink-0 ${plan.comingSoon ? 'text-[#94a3b8]' : plan.highlighted ? 'text-[#6366f1]' : 'text-[#10b981]'}`} />
                      {feat}
                    </li>
                  ))}
                </ul>

                <Link
                  href="/register"
                  className={`w-full text-center py-3 rounded-xl text-sm font-semibold transition-all duration-200 ${
                    plan.highlighted
                      ? 'bg-[#6366f1] hover:bg-[#5558e3] text-white shadow-lg shadow-indigo-500/25'
                      : 'bg-[#e2e8f0] hover:bg-[#cbd5e1] text-[#0f172a] border border-[#e2e8f0]'
                  }`}
                >
                  {plan.cta}
                </Link>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* Final CTA */}
      <section className="py-24">
        <div className="max-w-4xl mx-auto px-4 sm:px-6 lg:px-8 text-center">
          <div className="relative bg-gradient-to-br from-[#6366f1]/20 via-[#ffffff] to-[#8b5cf6]/20 border border-[#6366f1]/30 rounded-3xl p-12 overflow-hidden">
            <div className="absolute inset-0 pointer-events-none">
              <div className="absolute top-0 left-1/4 w-64 h-64 bg-[#6366f1]/10 rounded-full blur-3xl" />
              <div className="absolute bottom-0 right-1/4 w-64 h-64 bg-[#8b5cf6]/10 rounded-full blur-3xl" />
            </div>
            <div className="relative">
              <div className="inline-flex items-center gap-2 bg-[#6366f1]/20 border border-[#6366f1]/30 rounded-full px-4 py-1.5 text-sm text-[#a5b4fc] mb-6">
                <TrendingUp className="w-4 h-4" />
                Built for performance marketers
              </div>
              <h2 className="text-4xl sm:text-5xl font-extrabold text-[#0f172a] mb-4">
                Start tracking smarter today
              </h2>
              <p className="text-[#64748b] text-lg mb-8 max-w-xl mx-auto">
                Get full visibility into your Meta Ads performance. No credit card required.
                Cancel anytime.
              </p>
              <div className="flex flex-col sm:flex-row gap-4 justify-center">
                <Link
                  href="/register"
                  className="group inline-flex items-center justify-center gap-2 bg-[#6366f1] hover:bg-[#5558e3] text-white font-semibold px-8 py-3.5 rounded-xl transition-all duration-200 shadow-lg shadow-indigo-500/30"
                >
                  Create Free Account
                  <ArrowRight className="w-4 h-4 group-hover:translate-x-0.5 transition-transform" />
                </Link>
                <Link
                  href="/login"
                  className="inline-flex items-center justify-center gap-2 bg-transparent hover:bg-[#e2e8f0] border border-[#e2e8f0] text-[#0f172a] font-semibold px-8 py-3.5 rounded-xl transition-all duration-200"
                >
                  Sign In
                </Link>
              </div>
            </div>
          </div>
        </div>
      </section>

      {/* Footer */}
      <footer className="border-t border-[#e2e8f0] py-12">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="flex flex-col md:flex-row items-center justify-between gap-6">
            <div className="flex items-center gap-2">
              <div className="w-7 h-7 rounded-lg bg-gradient-to-br from-[#6366f1] to-[#8b5cf6] flex items-center justify-center">
                <Activity className="w-3.5 h-3.5 text-white" />
              </div>
              <span className="text-base font-bold text-[#0f172a]">
                Ad<span className="gradient-text">Flow</span>
              </span>
            </div>

            <div className="flex items-center gap-8 text-sm text-[#94a3b8]">
              <Link href="/privacy" className="hover:text-[#64748b] transition-colors">Privacy Policy</Link>
              <Link href="/terms" className="hover:text-[#64748b] transition-colors">Terms of Service</Link>
              <a href="mailto:info@digitaladexpert.de" className="hover:text-[#64748b] transition-colors">Support</a>
            </div>

            <p className="text-sm text-[#94a3b8]">
              © 2026 AdFlow. All rights reserved.
            </p>
          </div>
        </div>
      </footer>
    </div>
  );
}
