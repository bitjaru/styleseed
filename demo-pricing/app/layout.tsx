import type { Metadata, Viewport } from "next";
import { Inter } from "next/font/google";
import { Analytics } from "@vercel/analytics/next";
import "./globals.css";

const inter = Inter({
  variable: "--font-inter",
  subsets: ["latin"],
});

const SITE_URL = "https://styleseed-demo.vercel.app";
const SITE_NAME = "StyleSeed";
const SITE_DESC =
  "AI design-method engine for vibe coding — 8 output grammars, 5 surface adapters, and a reference compiler that turns screenshots, URLs, Figma, or existing UI into evidence-backed design rules. MIT licensed.";

export const metadata: Metadata = {
  metadataBase: new URL(SITE_URL),
  title: {
    default: "StyleSeed — Design engine for vibe coding",
    template: "%s · StyleSeed",
  },
  description: SITE_DESC,
  applicationName: SITE_NAME,
  keywords: [
    "design system",
    "vibe coding",
    "vibe coding design system",
    "Claude Code",
    "Cursor",
    "shadcn alternative",
    "Tailwind UI",
    "framer motion presets",
    "AI design",
    "Toss design",
    "design tokens",
    "디자인 시스템",
    "AI 디자인 시스템",
    "Cursor 디자인",
  ],
  authors: [{ name: "bitjaru", url: "https://github.com/bitjaru" }],
  creator: "bitjaru",
  publisher: "bitjaru",
  openGraph: {
    type: "website",
    siteName: SITE_NAME,
    title: "StyleSeed — Design engine for vibe coding",
    description: SITE_DESC,
    url: SITE_URL,
    locale: "en_US",
    images: [
      {
        url: "/og/styleseed-og.png",
        width: 1200,
        height: 630,
        alt: "StyleSeed — fixed AI design judgment, multiple output grammars, and reference-compiled rule sets.",
      },
    ],
  },
  twitter: {
    card: "summary_large_image",
    title: "StyleSeed — Design engine for vibe coding",
    description: SITE_DESC,
    images: ["/og/styleseed-og.png"],
    creator: "@bitjaru",
  },
  alternates: {
    canonical: SITE_URL,
  },
  category: "technology",
  // Set these in Vercel env (Project → Settings → Environment Variables) after
  // creating the Search Console / Bing Webmaster property via the HTML-tag method,
  // then redeploy. Left undefined → Next omits the tags (no empty meta).
  verification: {
    google: "cQk7E6KsVV0HMH6Fn1XgJwB2r5B0y4EQS86uNfynu14",
    other: process.env.NEXT_PUBLIC_BING_SITE_VERIFICATION
      ? { "msvalidate.01": process.env.NEXT_PUBLIC_BING_SITE_VERIFICATION }
      : {},
  },
};

export const viewport: Viewport = {
  themeColor: "#0a0a0a",
  width: "device-width",
  initialScale: 1,
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  const SAME_AS = [
    "https://github.com/bitjaru/styleseed",
    "https://x.com/kiwidigs",
    "https://dev.to/kiwibreaksme",
  ];
  const jsonLd = {
    "@context": "https://schema.org",
    "@graph": [
      {
        "@type": "SoftwareApplication",
        "@id": `${SITE_URL}/#software`,
        name: SITE_NAME,
        description: SITE_DESC,
        url: SITE_URL,
        applicationCategory: "DeveloperApplication",
        operatingSystem: "Web",
        offers: { "@type": "Offer", price: "0", priceCurrency: "USD" },
        license: "https://opensource.org/licenses/MIT",
        softwareVersion: "3.0.0",
        programmingLanguage: ["Markdown", "TypeScript", "React", "Python"],
        codeRepository: "https://github.com/bitjaru/styleseed",
        publisher: { "@id": `${SITE_URL}/#organization` },
        isPartOf: { "@id": `${SITE_URL}/#website` },
        dateModified: "2026-07-19",
        keywords:
          "design method for AI, Claude Code, Cursor, Codex, output grammars, reference compiler, AI UI, carousel design, vibe coding, design judgment",
        sameAs: SAME_AS,
      },
      {
        "@type": "Organization",
        "@id": `${SITE_URL}/#organization`,
        name: "StyleSeed",
        url: SITE_URL,
        logo: `${SITE_URL}/favicon.ico`,
        sameAs: SAME_AS,
      },
      {
        "@type": "WebSite",
        "@id": `${SITE_URL}/#website`,
        name: SITE_NAME,
        url: SITE_URL,
        description: SITE_DESC,
        publisher: { "@id": `${SITE_URL}/#organization` },
        inLanguage: "en",
        hasPart: [
          { "@id": `${SITE_URL}/showcase#page` },
          { "@id": `${SITE_URL}/architecture#page` },
        ],
      },
    ],
  };

  return (
    <html lang="en" className={`${inter.variable} h-full antialiased`}>
      <head>
        <link
          rel="stylesheet"
          href="https://fonts.googleapis.com/css2?family=Inter:wght@400;500;600;700;800&display=swap"
        />
        <script
          type="application/ld+json"
          dangerouslySetInnerHTML={{ __html: JSON.stringify(jsonLd) }}
        />
      </head>
      <body className="min-h-full">
        {children}
        <Analytics />
      </body>
    </html>
  );
}
