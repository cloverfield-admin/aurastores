import type { Metadata, Viewport } from "next";
import { Geist, Geist_Mono, Inter, Manrope } from "next/font/google";
import { AuraFeedbackProvider } from "@/components/providers/aura-feedback-provider";
import { AppQueryProvider } from "@/components/providers/query-provider";
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
  themeColor: "#0fb9b1",
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
      className={`${geistSans.variable} ${geistMono.variable} ${manrope.variable} ${inter.variable} h-full antialiased`}
    >
      <body className="min-h-full bg-zinc-50 text-zinc-900">
        <AppQueryProvider>
          <AuraFeedbackProvider>{children}</AuraFeedbackProvider>
        </AppQueryProvider>
      </body>
    </html>
  );
}
