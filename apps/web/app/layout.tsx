import type { Metadata } from 'next';
import { Inter } from 'next/font/google';
import './globals.css';

const inter = Inter({
  subsets: ['latin'],
  display: 'swap',
  variable: '--font-inter',
  weight: ['300', '400', '500', '600', '700', '800', '900'],
});

export const metadata: Metadata = {
  title: {
    default: 'AdFlow — Meta Ads Tracking & Attribution',
    template: '%s | AdFlow',
  },
  description:
    'AI-powered attribution platform for Meta Ads and performance marketers. Track every click, understand every conversion.',
  keywords: ['meta ads', 'tracking', 'attribution', 'analytics', 'performance marketing', 'click tracking'],
  authors: [{ name: 'AdFlow' }],
  creator: 'AdFlow',
  metadataBase: new URL('https://adflow.digitaladexpert.de'),
  openGraph: {
    type: 'website',
    locale: 'en_US',
    url: 'https://adflow.digitaladexpert.de',
    title: 'AdFlow — Meta Ads Tracking & Attribution',
    description: 'AI-powered attribution platform for Meta Ads and performance marketers.',
    siteName: 'AdFlow',
  },
  twitter: {
    card: 'summary_large_image',
    title: 'AdFlow — Meta Ads Tracking & Attribution',
    description: 'AI-powered attribution platform for Meta Ads and performance marketers.',
  },
  robots: {
    index: true,
    follow: true,
  },
};

export default function RootLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <html lang="en" className={`${inter.variable} dark`} suppressHydrationWarning>
      <head>
        <meta name="viewport" content="width=device-width, initial-scale=1" />
        <meta name="theme-color" content="#f8fafc" />
        <link rel="icon" href="/favicon.ico" />
      </head>
      <body className={`${inter.className} antialiased bg-background text-text-primary min-h-screen`}>
        {children}
      </body>
    </html>
  );
}
