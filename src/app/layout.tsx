import type { Metadata, Viewport } from "next";
import { Geist, Geist_Mono, Inter, Manrope } from "next/font/google";
import { AuraFeedbackProvider } from "@/components/providers/aura-feedback-provider";
import { AppQueryProvider } from "@/components/providers/query-provider";
import { ThemeColorMeta } from "@/components/providers/theme-color-meta";
import { ThemeProvider } from "@/components/providers/theme-provider";
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

const defaultTitle = "AuraPharma — Pharmacy management platform";
const defaultDescription =
  "Cloud-based pharmacy management with inventory, sales intelligence, and multi-branch sync.";

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
  applicationName: "AuraPharma",
  title: {
    default: defaultTitle,
    template: "%s | AuraPharma",
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
    siteName: "AuraPharma",
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
      className={`${geistSans.variable} ${geistMono.variable} ${manrope.variable} ${inter.variable} h-full antialiased`}
    >
      <body className="min-h-full bg-background text-foreground">
        <ThemeProvider>
          <ThemeColorMeta />
          <AppQueryProvider>
            <AuraFeedbackProvider>{children}</AuraFeedbackProvider>
          </AppQueryProvider>
        </ThemeProvider>
      </body>
    </html>
  );
}
