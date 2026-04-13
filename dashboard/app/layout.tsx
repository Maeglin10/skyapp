import type { Metadata } from "next";
import { Geist, Geist_Mono } from "next/font/google";
import "./globals.css";

const geistSans = Geist({
  variable: "--font-geist-sans",
  subsets: ["latin"],
});

const geistMono = Geist_Mono({
  variable: "--font-geist-mono",
  subsets: ["latin"],
});

export const metadata: Metadata = {
  metadataBase: new URL("https://aevia-app.vercel.app"),
  title: {
    default: "AeviaApp — Multi-Agent AI Orchestration API",
    template: "%s | AeviaApp",
  },
  description:
    "AeviaApp is a production-grade multi-agent AI orchestration API. Run parallel agent DAGs, persist semantic memory with pgvector, and control AI costs — all via a single REST API.",
  keywords: [
    "AI orchestration API",
    "AeviaApp",
    "multi-agent AI",
    "LLM API",
    "AI DAG scheduler",
    "semantic memory pgvector",
    "Claude API",
    "GPT-4 API",
    "AI automation",
    "Valentin Milliand",
  ],
  authors: [{ name: "Valentin Milliand", url: "https://valentin-milliand.vercel.app" }],
  creator: "Valentin Milliand",
  openGraph: {
    type: "website",
    locale: "en_US",
    url: "https://aevia-app.vercel.app",
    siteName: "AeviaApp",
    title: "AeviaApp — Multi-Agent AI Orchestration API",
    description:
      "Production-grade multi-agent AI orchestration API. Parallel agent DAGs, semantic memory, cost governance — one REST API.",
    images: [
      {
        url: "/og.png",
        width: 1200,
        height: 630,
        alt: "AeviaApp — Multi-Agent AI Orchestration API",
      },
    ],
  },
  twitter: {
    card: "summary_large_image",
    title: "AeviaApp — Multi-Agent AI Orchestration API",
    description:
      "Production-grade multi-agent AI orchestration API. Parallel agent DAGs, semantic memory, cost governance — one REST API.",
    images: ["/og.png"],
    creator: "@valentinmilliand",
  },
  robots: {
    index: true,
    follow: true,
    googleBot: { index: true, follow: true },
  },
  alternates: {
    canonical: "https://aevia-app.vercel.app",
  },
};

const schemaOrg = [
  {
    '@context': 'https://schema.org',
    '@type': 'SoftwareApplication',
    name: 'AeviaApp',
    url: 'https://aevia-app.vercel.app',
    applicationCategory: 'DeveloperApplication',
    operatingSystem: 'All',
    description:
      'Production-grade multi-agent AI orchestration API. Run parallel agent DAGs, persist semantic memory with pgvector, and control AI costs via a single REST API.',
    offers: {
      '@type': 'Offer',
      price: '0',
      priceCurrency: 'USD',
      description: 'Free tier: 100 API calls/month. No credit card required.',
    },
    author: {
      '@type': 'Person',
      name: 'Valentin Milliand',
      url: 'https://valentin-milliand.vercel.app',
    },
  },
  {
    '@context': 'https://schema.org',
    '@type': 'WebAPI',
    name: 'AeviaApp REST API',
    url: 'https://aevia-app-api.onrender.com',
    description:
      'REST API for multi-agent AI orchestration. Endpoints: /agents/run, /agents/orchestrate, /agents/stream (SSE), /memory/store, /memory/query.',
    documentation: 'https://aevia-app.vercel.app/docs',
    provider: {
      '@type': 'Person',
      name: 'Valentin Milliand',
      url: 'https://valentin-milliand.vercel.app',
    },
  },
]

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html
      lang="en"
      className={`${geistSans.variable} ${geistMono.variable} h-full antialiased`}
    >
      <head>
        <script
          type="application/ld+json"
          dangerouslySetInnerHTML={{ __html: JSON.stringify(schemaOrg) }}
        />
      </head>
      <body className="min-h-full flex flex-col">{children}</body>
    </html>
  );
}
