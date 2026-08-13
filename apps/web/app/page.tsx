'use client';

import Link from 'next/link';
import { useState } from 'react';
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
  MapPin,
  Smartphone,
  AlertTriangle,
  CheckCircle2,
  Clock,
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
    badge: null,
    comingSoon: false,
  },
  {
    name: 'Pro',
    price: null,
    period: '/month',
    description: 'For serious performance marketers',
    features: [
      'Unlimited clicks/month',
      'Unlimited tracking links',
      'Unlimited campaigns',
      'AI insights & anomaly detection',
      'Conversion postbacks',
      'Bot detection',
      '1-year data retention',
      'Priority email support',
    ],
    cta: 'Coming Soon',
    highlighted: true,
    badge: 'Coming Soon',
    comingSoon: true,
  },
  {
    name: 'Team',
    price: null,
    period: '/month',
    description: 'For agencies and large teams',
    features: [
      'Unlimited clicks/month',
      'Unlimited everything',
      'Multi-user access',
      'Custom attribution windows',
      'White-label reports',
      'API access',
      'Unlimited data retention',
      'Dedicated Slack support',
    ],
    cta: 'Coming Soon',
    highlighted: false,
    badge: 'Coming Soon',
    comingSoon: true,
  },
];

const SHOWCASE_TABS = [
  { id: 'analytics', label: 'Analytics' },
  { id: 'flows', label: 'Flow Builder' },
  { id: 'links', label: 'Link Detail' },
  { id: 'utm', label: 'UTM Builder' },
  { id: 'alerts', label: 'Smart Alerts' },
];

const STATS = [
  { value: 'Self-Hosted', label: 'Your Infrastructure', icon: <MousePointerClick className="w-5 h-5" /> },
  { value: 'S2S + Pixel', label: 'Dual Conversion Tracking', icon: <Activity className="w-5 h-5" /> },
  { value: 'Meta CAPI', label: 'Native Integration', icon: <Zap className="w-5 h-5" /> },
  { value: 'Real-Time', label: 'Click-Level Data', icon: <Globe className="w-5 h-5" /> },
];

export default function LandingPage() {
  const [mobileMenuOpen, setMobileMenuOpen] = useState(false);
  const [showcaseTab, setShowcaseTab] = useState('analytics');

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
              href="#features"
              className="inline-flex items-center justify-center gap-2 bg-[#ffffff] hover:bg-[#e2e8f0] border border-[#e2e8f0] text-[#0f172a] font-semibold px-8 py-3.5 rounded-xl transition-all duration-200"
            >
              View Demo
            </a>
          </div>

          {/* Mock Dashboard Preview */}
          <div className="relative max-w-5xl mx-auto">
            {/* Glow behind dashboard */}
            <div className="absolute inset-0 bg-gradient-to-t from-[#6366f1]/20 to-transparent rounded-2xl blur-xl" />

            <div className="relative bg-[#ffffff] border border-[#e2e8f0] rounded-2xl overflow-hidden shadow-2xl">
              {/* Browser chrome */}
              <div className="flex items-center gap-2 px-4 py-3 border-b border-[#e2e8f0] bg-[#f8fafc]">
                <div className="w-3 h-3 rounded-full bg-[#ef4444]/60" />
                <div className="w-3 h-3 rounded-full bg-[#f59e0b]/60" />
                <div className="w-3 h-3 rounded-full bg-[#10b981]/60" />
                <div className="flex-1 mx-4 bg-[#e2e8f0] rounded-md px-3 py-1 text-xs text-[#94a3b8]">
                  app.adflow.digitaladexpert.de/dashboard
                </div>
              </div>

              {/* Dashboard mockup */}
              <div className="p-6 bg-[#f8fafc] overflow-x-auto">
                <div className="min-w-[640px]">
                {/* KPI row */}
                <div className="grid grid-cols-5 gap-3 mb-5">
                  {[
                    { label: 'Total Clicks', value: '1,284,392', change: '+12.5%', color: 'text-[#10b981]' },
                    { label: 'Conversions', value: '24,891', change: '+8.3%', color: 'text-[#10b981]' },
                    { label: 'Revenue', value: '$182,440', change: '+21.2%', color: 'text-[#10b981]' },
                    { label: 'ROAS', value: '4.2x', change: '+0.8x', color: 'text-[#10b981]' },
                    { label: 'Bot Rate', value: '2.1%', change: '-0.4%', color: 'text-[#10b981]' },
                  ].map((kpi) => (
                    <div key={kpi.label} className="bg-[#ffffff] border border-[#e2e8f0] rounded-xl p-3">
                      <p className="text-[10px] text-[#94a3b8] mb-1">{kpi.label}</p>
                      <p className="text-sm font-bold text-[#0f172a]">{kpi.value}</p>
                      <p className={`text-[10px] font-medium ${kpi.color}`}>{kpi.change}</p>
                    </div>
                  ))}
                </div>

                {/* Chart area */}
                <div className="grid grid-cols-3 gap-3">
                  <div className="col-span-2 bg-[#ffffff] border border-[#e2e8f0] rounded-xl p-4">
                    <p className="text-xs text-[#64748b] font-medium mb-4">Performance Overview — 30 days</p>
                    <div className="flex items-end gap-1 h-20">
                      {[35, 52, 41, 67, 55, 72, 61, 78, 65, 88, 71, 94, 82, 73, 90, 85, 96, 88, 104, 92, 110, 98, 115, 108, 120, 112, 128, 118, 135, 125].map((h, i) => (
                        <div key={i} className="flex-1 flex flex-col gap-0.5 items-center">
                          <div
                            style={{ height: `${(h / 135) * 80}px` }}
                            className="w-full bg-gradient-to-t from-[#6366f1]/60 to-[#8b5cf6]/60 rounded-sm"
                          />
                        </div>
                      ))}
                    </div>
                  </div>
                  <div className="bg-[#ffffff] border border-[#e2e8f0] rounded-xl p-4">
                    <p className="text-xs text-[#64748b] font-medium mb-4">Traffic by Device</p>
                    <div className="space-y-3">
                      {[
                        { label: 'Mobile', pct: 68, color: 'bg-[#6366f1]' },
                        { label: 'Desktop', pct: 24, color: 'bg-[#8b5cf6]' },
                        { label: 'Tablet', pct: 8, color: 'bg-[#a78bfa]' },
                      ].map((d) => (
                        <div key={d.label}>
                          <div className="flex justify-between text-[10px] text-[#94a3b8] mb-1">
                            <span>{d.label}</span>
                            <span>{d.pct}%</span>
                          </div>
                          <div className="h-1.5 bg-[#e2e8f0] rounded-full overflow-hidden">
                            <div className={`h-full ${d.color} rounded-full`} style={{ width: `${d.pct}%` }} />
                          </div>
                        </div>
                      ))}
                    </div>
                  </div>
                </div>
                </div>
              </div>
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
              <span className="gradient-text">track smarter</span>
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

          {/* Mockup window */}
          <div className="relative max-w-5xl mx-auto">
            <div className="absolute inset-0 bg-gradient-to-t from-[#6366f1]/15 to-transparent rounded-2xl blur-xl" />
            <div className="relative bg-[#ffffff] border border-[#e2e8f0] rounded-2xl overflow-hidden shadow-2xl">
              {/* Browser chrome */}
              <div className="flex items-center gap-2 px-4 py-3 border-b border-[#e2e8f0] bg-[#f8fafc]">
                <div className="w-3 h-3 rounded-full bg-[#ef4444]/60" />
                <div className="w-3 h-3 rounded-full bg-[#f59e0b]/60" />
                <div className="w-3 h-3 rounded-full bg-[#10b981]/60" />
                <div className="flex-1 mx-4 bg-[#e2e8f0] rounded-md px-3 py-1 text-xs text-[#94a3b8]">
                  adflow.digitaladexpert.de/{showcaseTab === 'analytics' ? 'analytics' : showcaseTab === 'flows' ? 'flows' : showcaseTab === 'links' ? 'links/abc12345' : showcaseTab === 'utm' ? 'utm-builder' : 'alerts'}
                </div>
              </div>

              <div className="p-5 bg-[#f8fafc] min-h-[340px] overflow-x-auto">
                <div className="min-w-[600px]">

                {/* Analytics tab */}
                {showcaseTab === 'analytics' && (
                  <div className="space-y-4">
                    <div className="grid grid-cols-3 gap-3">
                      {[
                        { label: 'Total Clicks', value: '48,291', change: '+14.2%', up: true },
                        { label: 'Unique Visitors', value: '31,840', change: '+9.7%', up: true },
                        { label: 'Bot Rate', value: '1.8%', change: '-0.3%', up: false },
                      ].map((s) => (
                        <div key={s.label} className="bg-[#ffffff] border border-[#e2e8f0] rounded-xl p-3">
                          <p className="text-[10px] text-[#94a3b8] mb-1">{s.label}</p>
                          <p className="text-lg font-bold text-[#0f172a]">{s.value}</p>
                          <p className={`text-[10px] font-medium ${s.up ? 'text-[#10b981]' : 'text-[#f59e0b]'}`}>{s.change} vs last period</p>
                        </div>
                      ))}
                    </div>
                    <div className="grid grid-cols-3 gap-3">
                      <div className="col-span-2 bg-[#ffffff] border border-[#e2e8f0] rounded-xl p-4">
                        <p className="text-xs text-[#64748b] font-medium mb-3">Clicks over time — 14 days</p>
                        <div className="flex items-end gap-1 h-16">
                          {[40,55,48,70,62,85,74,90,68,95,82,105,88,112].map((h, i) => (
                            <div key={i} className="flex-1">
                              <div style={{ height: `${(h/112)*64}px` }} className="w-full bg-gradient-to-t from-[#6366f1]/70 to-[#8b5cf6]/40 rounded-sm" />
                            </div>
                          ))}
                        </div>
                      </div>
                      <div className="bg-[#ffffff] border border-[#e2e8f0] rounded-xl p-4">
                        <p className="text-xs text-[#64748b] font-medium mb-3">Top Countries</p>
                        <div className="space-y-2">
                          {[{ c: 'Turkey', pct: 42 }, { c: 'Germany', pct: 28 }, { c: 'US', pct: 18 }, { c: 'UK', pct: 12 }].map((r) => (
                            <div key={r.c} className="flex items-center gap-2">
                              <MapPin className="w-3 h-3 text-[#94a3b8] flex-shrink-0" />
                              <span className="text-[10px] text-[#64748b] flex-1">{r.c}</span>
                              <span className="text-[10px] font-semibold text-[#0f172a]">{r.pct}%</span>
                            </div>
                          ))}
                        </div>
                      </div>
                    </div>
                    <div className="bg-[#ffffff] border border-[#e2e8f0] rounded-xl p-4">
                      <p className="text-xs text-[#64748b] font-medium mb-3">Device Breakdown</p>
                      <div className="grid grid-cols-3 gap-4">
                        {[{ d: 'Mobile', pct: 64, color: 'bg-[#6366f1]' }, { d: 'Desktop', pct: 29, color: 'bg-[#8b5cf6]' }, { d: 'Tablet', pct: 7, color: 'bg-[#a78bfa]' }].map((d) => (
                          <div key={d.d}>
                            <div className="flex justify-between mb-1">
                              <span className="text-[10px] text-[#94a3b8] flex items-center gap-1"><Smartphone className="w-2.5 h-2.5" />{d.d}</span>
                              <span className="text-[10px] font-semibold text-[#0f172a]">{d.pct}%</span>
                            </div>
                            <div className="h-1.5 bg-[#e2e8f0] rounded-full"><div className={`h-full ${d.color} rounded-full`} style={{ width: `${d.pct}%` }} /></div>
                          </div>
                        ))}
                      </div>
                    </div>
                  </div>
                )}

                {/* Flow Builder tab */}
                {showcaseTab === 'flows' && (
                  <div className="space-y-4">
                    <div className="flex items-center justify-between">
                      <div className="flex items-center gap-2">
                        <span className="px-2 py-0.5 rounded-full text-[10px] font-semibold bg-[#10b981]/10 text-[#10b981]">Active</span>
                        <span className="text-sm font-semibold text-[#0f172a]">Meta → Geo Split → Offer</span>
                      </div>
                      <span className="text-[10px] text-[#94a3b8]">A/B Split Test</span>
                    </div>

                    <div className="bg-[#ffffff] border border-[#e2e8f0] rounded-xl p-5">
                      <div className="flex items-center gap-3 flex-wrap">
                        <div className="px-3 py-2 rounded-lg bg-[#6366f1]/10 border border-[#6366f1]/20 text-center">
                          <p className="text-[9px] text-[#94a3b8] mb-0.5">SOURCE</p>
                          <p className="text-xs font-semibold text-[#0f172a]">Meta Ads</p>
                        </div>
                        <ChevronRight className="w-4 h-4 text-[#cbd5e1]" />
                        <div className="flex flex-col gap-2">
                          <div className="flex items-center gap-2 px-3 py-2 rounded-lg bg-[#f8fafc] border border-[#e2e8f0]">
                            <span className="text-[10px] font-bold text-[#6366f1] w-8">70%</span>
                            <span className="text-xs text-[#64748b]">Lander A → Offer 1</span>
                          </div>
                          <div className="flex items-center gap-2 px-3 py-2 rounded-lg bg-[#f8fafc] border border-[#e2e8f0]">
                            <span className="text-[10px] font-bold text-[#8b5cf6] w-8">30%</span>
                            <span className="text-xs text-[#64748b]">Lander B → Offer 2</span>
                          </div>
                        </div>
                      </div>

                      <div className="mt-4 pt-4 border-t border-[#e2e8f0]">
                        <p className="text-[10px] font-semibold text-[#94a3b8] uppercase tracking-wide mb-2">Conditional Rules</p>
                        <div className="flex items-center gap-2 text-xs text-[#64748b] bg-[#f8fafc] rounded-lg px-3 py-2">
                          <span className="px-1.5 py-0.5 rounded bg-[#e2e8f0] text-[10px] font-mono">IF</span>
                          country = US
                          <span className="px-1.5 py-0.5 rounded bg-[#e2e8f0] text-[10px] font-mono">THEN</span>
                          route to Offer 1
                        </div>
                      </div>
                    </div>

                    <p className="text-[11px] text-[#94a3b8] text-center">
                      Route traffic by country, device, OS, or language — or split-test paths with weighted distribution.
                    </p>
                  </div>
                )}

                {/* Link Detail tab */}
                {showcaseTab === 'links' && (
                  <div className="space-y-4">
                    <div className="grid grid-cols-4 gap-3">
                      {[
                        { label: 'Total Clicks', value: '2,841', color: 'text-[#818cf8]' },
                        { label: 'Human', value: '2,790', color: 'text-[#10b981]' },
                        { label: 'Bots Filtered', value: '51', color: 'text-[#ef4444]' },
                        { label: 'Conversions', value: '134', color: 'text-[#f59e0b]' },
                      ].map((s) => (
                        <div key={s.label} className="bg-[#ffffff] border border-[#e2e8f0] rounded-xl p-3 text-center">
                          <p className="text-[10px] text-[#94a3b8] mb-1">{s.label}</p>
                          <p className={`text-xl font-bold ${s.color}`}>{s.value}</p>
                        </div>
                      ))}
                    </div>
                    <div className="bg-[#ffffff] border border-[#e2e8f0] rounded-xl overflow-hidden">
                      <div className="grid grid-cols-6 gap-2 px-4 py-2 border-b border-[#e2e8f0] bg-[#f8fafc]">
                        {['Time', 'Country', 'Device', 'UTM Source', 'Status', 'Converted'].map((h) => (
                          <span key={h} className="text-[10px] font-semibold text-[#94a3b8] uppercase tracking-wide">{h}</span>
                        ))}
                      </div>
                      {[
                        { time: '2m ago', country: '🇹🇷 Turkey', device: 'Mobile', source: 'facebook', status: 'Human', conv: true },
                        { time: '5m ago', country: '🇩🇪 Germany', device: 'Desktop', source: 'google', status: 'Human', conv: false },
                        { time: '8m ago', country: '🇺🇸 US', device: 'Mobile', source: 'facebook', status: 'Bot', conv: false },
                        { time: '11m ago', country: '🇬🇧 UK', device: 'Desktop', source: 'tiktok', status: 'Human', conv: true },
                        { time: '14m ago', country: '🇹🇷 Turkey', device: 'Mobile', source: 'facebook', status: 'Human', conv: false },
                      ].map((row, i) => (
                        <div key={i} className="grid grid-cols-6 gap-2 px-4 py-2.5 border-b border-[#e2e8f0]/50 hover:bg-[#ffffff] transition-colors">
                          <span className="text-[10px] text-[#94a3b8] flex items-center gap-1"><Clock className="w-2.5 h-2.5" />{row.time}</span>
                          <span className="text-[10px] text-[#64748b]">{row.country}</span>
                          <span className="text-[10px] text-[#64748b] flex items-center gap-1"><Smartphone className="w-2.5 h-2.5" />{row.device}</span>
                          <span className="text-[10px] text-[#818cf8]">{row.source}</span>
                          <span className={`text-[10px] font-semibold ${row.status === 'Bot' ? 'text-[#ef4444]' : 'text-[#10b981]'}`}>{row.status}</span>
                          <span>{row.conv ? <CheckCircle2 className="w-3.5 h-3.5 text-[#10b981]" /> : <span className="text-[10px] text-[#94a3b8]">—</span>}</span>
                        </div>
                      ))}
                    </div>
                  </div>
                )}

                {/* UTM Builder tab */}
                {showcaseTab === 'utm' && (
                  <div className="grid grid-cols-2 gap-5">
                    <div className="space-y-4">
                      <div className="grid grid-cols-4 gap-2">
                        {[
                          { label: 'Meta Ads', color: 'text-[#1877F2] bg-[#1877F2]/10 border-[#1877F2]/20' },
                          { label: 'Google Ads', color: 'text-[#34A853] bg-[#34A853]/10 border-[#34A853]/20' },
                          { label: 'TikTok', color: 'text-[#ff0050] bg-[#ff0050]/10 border-[#ff0050]/20' },
                          { label: 'Email', color: 'text-[#f59e0b] bg-[#f59e0b]/10 border-[#f59e0b]/20' },
                        ].map((p) => (
                          <div key={p.label} className={`text-center text-[10px] font-semibold px-2 py-2 rounded-xl border ${p.color}`}>{p.label}</div>
                        ))}
                      </div>
                      <div className="bg-[#ffffff] border border-[#e2e8f0] rounded-xl p-4 space-y-3">
                        <p className="text-xs font-semibold text-[#0f172a]">Parameters</p>
                        {[
                          { label: 'Destination URL', val: 'chromewebstore.google.com/detail/...' },
                          { label: 'UTM Source', val: 'facebook' },
                          { label: 'UTM Medium', val: 'paid_social' },
                          { label: 'UTM Campaign', val: 'stylekit_launch' },
                          { label: 'UTM Content', val: '{{ad.id}}' },
                        ].map((f) => (
                          <div key={f.label}>
                            <p className="text-[10px] text-[#94a3b8] mb-1">{f.label}</p>
                            <div className="bg-[#f8fafc] border border-[#e2e8f0] rounded-lg px-3 py-1.5">
                              <p className="text-[10px] text-[#64748b] truncate">{f.val}</p>
                            </div>
                          </div>
                        ))}
                      </div>
                    </div>
                    <div className="space-y-4">
                      <div className="bg-[#ffffff] border border-[#e2e8f0] rounded-xl p-4">
                        <p className="text-[10px] font-semibold text-[#64748b] uppercase tracking-wider mb-3">Preview URL</p>
                        <div className="bg-[#f8fafc] border border-[#e2e8f0] rounded-xl p-3 mb-3">
                          <p className="text-[10px] font-mono text-[#818cf8] break-all leading-relaxed">chromewebstore.google.com/detail/...?utm_source=facebook&utm_medium=paid_social&utm_campaign=stylekit_launch&utm_content={'{{ad.id}}'}</p>
                        </div>
                        <div className="space-y-1.5">
                          {[['utm_source', 'facebook'], ['utm_medium', 'paid_social'], ['utm_campaign', 'stylekit_launch']].map(([k, v]) => (
                            <div key={k} className="flex items-center gap-2">
                              <span className="text-[9px] font-mono text-[#6366f1] bg-[#6366f1]/10 px-2 py-0.5 rounded w-28 flex-shrink-0">{k}</span>
                              <span className="text-[10px] text-[#64748b]">{v}</span>
                            </div>
                          ))}
                        </div>
                      </div>
                      <div className="bg-[#6366f1] rounded-xl py-3 text-center">
                        <p className="text-xs font-semibold text-white">+ Create Tracking Link</p>
                      </div>
                      <div className="bg-[#10b981]/10 border border-[#10b981]/20 rounded-xl p-3">
                        <p className="text-[10px] font-semibold text-[#10b981] mb-1">Tracking link created!</p>
                        <p className="text-[10px] font-mono text-[#34d399]">adflow.digitaladexpert.de/r/xK9mP2qA</p>
                      </div>
                    </div>
                  </div>
                )}

                {/* Smart Alerts tab */}
                {showcaseTab === 'alerts' && (
                  <div className="space-y-4">
                    <div className="grid grid-cols-3 gap-3">
                      {[
                        { label: 'Triggered', value: '1', color: 'text-[#ef4444]', bg: 'bg-[#ef4444]/10 border-[#ef4444]/20' },
                        { label: 'Healthy', value: '3', color: 'text-[#10b981]', bg: 'bg-[#10b981]/10 border-[#10b981]/20' },
                        { label: 'Disabled', value: '1', color: 'text-[#94a3b8]', bg: 'bg-[#e2e8f0] border-[#e2e8f0]' },
                      ].map((s) => (
                        <div key={s.label} className={`border rounded-xl p-3 text-center ${s.bg}`}>
                          <p className="text-[10px] text-[#64748b] mb-1">{s.label}</p>
                          <p className={`text-2xl font-bold ${s.color}`}>{s.value}</p>
                        </div>
                      ))}
                    </div>
                    <div className="bg-[#ffffff] border border-[#e2e8f0] rounded-xl overflow-hidden">
                      {[
                        { name: 'High Bot Rate', metric: 'bot_rate > 10%', current: '12.4%', status: 'triggered' },
                        { name: 'Daily Clicks Drop', metric: 'clicks < 500', current: '1,240', status: 'healthy' },
                        { name: 'Revenue Alert', metric: 'revenue > $1,000', current: '$840', status: 'healthy' },
                        { name: 'Conv. Rate Drop', metric: 'conversions < 10', current: '34', status: 'healthy' },
                        { name: 'CPA Monitor', metric: 'cpa > $50', current: 'Disabled', status: 'disabled' },
                      ].map((alert, i) => (
                        <div key={i} className="flex items-center gap-4 px-4 py-3 border-b border-[#e2e8f0]/50">
                          <div className={`w-2 h-2 rounded-full flex-shrink-0 ${alert.status === 'triggered' ? 'bg-[#ef4444]' : alert.status === 'healthy' ? 'bg-[#10b981]' : 'bg-[#94a3b8]'}`} />
                          <div className="flex-1 min-w-0">
                            <p className="text-xs font-semibold text-[#0f172a]">{alert.name}</p>
                            <p className="text-[10px] text-[#94a3b8]">{alert.metric}</p>
                          </div>
                          <div className="text-right">
                            <p className={`text-xs font-bold ${alert.status === 'triggered' ? 'text-[#ef4444]' : alert.status === 'healthy' ? 'text-[#10b981]' : 'text-[#94a3b8]'}`}>{alert.current}</p>
                          </div>
                          {alert.status === 'triggered' && (
                            <AlertTriangle className="w-4 h-4 text-[#ef4444] flex-shrink-0" />
                          )}
                        </div>
                      ))}
                    </div>
                    <div className="bg-[#ffffff] border border-[#6366f1]/30 rounded-xl p-4">
                      <p className="text-xs font-semibold text-[#0f172a] mb-1">New Alert Rule</p>
                      <div className="grid grid-cols-3 gap-2 mt-2">
                        <div className="bg-[#f8fafc] border border-[#6366f1]/30 rounded-lg px-3 py-2 text-[10px] text-[#818cf8]">Bot Rate</div>
                        <div className="bg-[#f8fafc] border border-[#e2e8f0] rounded-lg px-3 py-2 text-[10px] text-[#64748b]">greater than</div>
                        <div className="bg-[#f8fafc] border border-[#e2e8f0] rounded-lg px-3 py-2 text-[10px] text-[#64748b]">10%</div>
                      </div>
                    </div>
                  </div>
                )}

                </div>
              </div>
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
              Start free today. Paid plans are coming soon — pricing will be announced shortly.
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

                <ul className="space-y-3 flex-1 mb-7">
                  {plan.features.map((feat) => (
                    <li key={feat} className="flex items-center gap-3 text-sm text-[#64748b]">
                      <Check className={`w-4 h-4 flex-shrink-0 ${plan.comingSoon ? 'text-[#94a3b8]' : plan.highlighted ? 'text-[#6366f1]' : 'text-[#10b981]'}`} />
                      {feat}
                    </li>
                  ))}
                </ul>

                {plan.comingSoon ? (
                  <div className="w-full text-center py-3 rounded-xl text-sm font-semibold bg-[#e2e8f0] border border-[#cbd5e1] text-[#94a3b8] cursor-not-allowed select-none">
                    Coming Soon
                  </div>
                ) : (
                  <Link
                    href="/register"
                    className="w-full text-center py-3 rounded-xl text-sm font-semibold transition-all duration-200 bg-[#e2e8f0] hover:bg-[#cbd5e1] text-[#0f172a] border border-[#e2e8f0]"
                  >
                    {plan.cta}
                  </Link>
                )}
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
