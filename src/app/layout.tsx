import type { Metadata, Viewport } from "next";
import { Analytics } from "@vercel/analytics/next";
import {
  Geist,
  Geist_Mono,
  IBM_Plex_Mono,
  Inter,
  Manrope,
  Schibsted_Grotesk,
} from "next/font/google";
import { AuraFeedbackProvider } from "@/components/providers/aura-feedback-provider";
import { AppQueryProvider } from "@/components/providers/query-provider";
import { ThemeColorMeta } from "@/components/providers/theme-color-meta";
import { ThemeProvider } from "@/components/providers/theme-provider";
import { ThemeStorageMigrate } from "@/components/providers/theme-storage-migrate";
import { PRODUCT_NAME, PRODUCT_TAGLINE } from "@/lib/brand";
import { getMetadataBase } from "@/lib/site-url";
import "./globals.css";

const geistSans = Geist({
  variable: "--font-geist-sans",
  subsets: ["latin"],
});

const geistMono = Geist_Mono({
  variable: "--font-geist-mono",
  subsets: ["latin"],
});

const manrope = Manrope({
  variable: "--font-manrope",
  subsets: ["latin"],
});

const inter = Inter({
  variable: "--font-inter",
  subsets: ["latin"],
});

// Marketing landing typography (Schibsted Grotesk display + IBM Plex Mono eyebrows/labels).
const schibstedGrotesk = Schibsted_Grotesk({
  variable: "--font-schibsted",
  subsets: ["latin"],
  weight: ["500", "600", "700", "800"],
});

const plexMono = IBM_Plex_Mono({
  variable: "--font-plex-mono",
  subsets: ["latin"],
  weight: ["400", "500", "600"],
});

const defaultTitle = `${PRODUCT_NAME} — ${PRODUCT_TAGLINE}`;
const defaultDescription =
  "Cloud-based store operations with inventory, sales intelligence, and multi-branch sync.";

export const viewport: Viewport = {
  width: "device-width",
  initialScale: 1,
  viewportFit: "cover",
  themeColor: [
    { media: "(prefers-color-scheme: light)", color: "#0fb9b1" },
    { media: "(prefers-color-scheme: dark)", color: "#0f766e" },
  ],
};

export const metadata: Metadata = {
  metadataBase: getMetadataBase(),
  applicationName: PRODUCT_NAME,
  title: {
    default: defaultTitle,
    template: `%s | ${PRODUCT_NAME}`,
  },
  description: defaultDescription,
  appleWebApp: {
    capable: true,
    title: defaultTitle,
    statusBarStyle: "default",
  },
  formatDetection: {
    telephone: false,
  },
  openGraph: {
    type: "website",
    locale: "en_US",
    siteName: PRODUCT_NAME,
    title: defaultTitle,
    description: defaultDescription,
  },
  twitter: {
    card: "summary_large_image",
    title: defaultTitle,
    description: defaultDescription,
  },
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html
      lang="en"
      suppressHydrationWarning
      className={`${geistSans.variable} ${geistMono.variable} ${manrope.variable} ${inter.variable} ${schibstedGrotesk.variable} ${plexMono.variable} h-full antialiased`}
    >
      <body className="min-h-full bg-background text-foreground">
        <ThemeStorageMigrate />
        <ThemeProvider>
          <ThemeColorMeta />
          <AppQueryProvider>
            <AuraFeedbackProvider>{children}</AuraFeedbackProvider>
          </AppQueryProvider>
        </ThemeProvider>
        <Analytics />
      </body>
    </html>
  );
}
