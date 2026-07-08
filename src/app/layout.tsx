import type { Metadata, Viewport } from "next";
import { Geist, Geist_Mono } from "next/font/google";
import "./globals.css";
import { ThemeProvider } from "@/src/components/layout/theme-provider";
import { ServiceWorkerRegister } from "@/src/components/layout/sw-register";
import { DynamicBranding } from "@/src/components/layout/dynamic-branding";
import { Toaster } from "sonner";

const APP_NAME = process.env.NEXT_PUBLIC_APP_NAME || "Nexora Finance";
const APP_URL = process.env.NEXT_PUBLIC_APP_URL || "http://localhost:3000";
const APP_DOMAIN = process.env.NEXT_PUBLIC_APP_DOMAIN || "nexora.app";
const APP_DESCRIPTION = "Control financiero personal inteligente. Gestiona ingresos, gastos, tarjetas, metas de ahorro y gastos fijos. PWA con notificaciones push, estadísticas avanzadas y seguridad PIN.";

const geistSans = Geist({
  variable: "--font-geist-sans",
  subsets: ["latin"],
});

const geistMono = Geist_Mono({
  variable: "--font-geist-mono",
  subsets: ["latin"],
});

export const metadata: Metadata = {
  // ── Basic ──────────────────────────────────────────────────────
  title: {
    default: `${APP_NAME} — Control financiero personal`,
    template: `%s — ${APP_NAME}`,
  },
  description: APP_DESCRIPTION,
  applicationName: APP_NAME,
  generator: "Next.js",
  keywords: [
    "finanzas personales", "control de gastos", "presupuesto", "ahorro",
    "metas financieras", "tarjetas de crédito", "gastos fijos",
    "notificaciones de pago", "PWA finanzas", "app financiera",
    "gestión financiera", "Colombia", "COP", "finanzas Colombia",
  ],
  authors: [{ name: APP_NAME, url: APP_URL }],
  creator: APP_NAME,
  publisher: APP_NAME,
  metadataBase: new URL(APP_URL),
  alternates: {
    canonical: "/",
  },

  // ── Robots / Crawling ───────────────────────────────────────────
  robots: {
    index: true,
    follow: true,
    nocache: false,
    googleBot: {
      index: true,
      follow: true,
      "max-video-preview": -1,
      "max-image-preview": "large",
      "max-snippet": -1,
    },
  },

  // ── Open Graph ──────────────────────────────────────────────────
  openGraph: {
    type: "website",
    locale: "es_CO",
    url: APP_URL,
    siteName: APP_NAME,
    title: `${APP_NAME} — Control financiero personal`,
    description: APP_DESCRIPTION,
    images: [
      {
        url: "/og.jpg",
        width: 1200,
        height: 630,
        alt: `${APP_NAME} — Control financiero personal`,
        type: "image/jpeg",
      },
    ],
  },

  // ── Twitter Card ────────────────────────────────────────────────
  twitter: {
    card: "summary_large_image",
    title: `${APP_NAME} — Control financiero personal`,
    description: APP_DESCRIPTION,
    creator: `@${APP_DOMAIN.replace(/\./g, "")}`,
    images: ["/og.jpg"],
  },

  // ── PWA / Icons ─────────────────────────────────────────────────
  manifest: "/manifest.json",
  appleWebApp: {
    capable: true,
    statusBarStyle: "black-translucent",
    title: APP_NAME,
    startupImage: [],
  },
  icons: {
    icon: [
      { url: "/favicon.ico", sizes: "48x48" },
      { url: "/icons/icon-192x192.png", sizes: "192x192", type: "image/png" },
      { url: "/icons/icon-512x512.png", sizes: "512x512", type: "image/png" },
    ],
    apple: [
      { url: "/icons/icon-192x192.png", sizes: "192x192", type: "image/png" },
    ],
    shortcut: ["/favicon.ico"],
  },

  // ── Misc ────────────────────────────────────────────────────────
  formatDetection: {
    telephone: false,
    email: true,
    address: false,
  },
  category: "Finance",
  classification: "Personal Finance",
  referrer: "origin-when-cross-origin",
};

export const viewport: Viewport = {
  themeColor: [
    { media: "(prefers-color-scheme: dark)", color: "#050609" },
    { media: "(prefers-color-scheme: light)", color: "#f5f6fa" },
  ],
  width: "device-width",
  initialScale: 1,
  maximumScale: 1,
  userScalable: false,
  colorScheme: "dark light",
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="es-CO" className={`${geistSans.variable} ${geistMono.variable}`} suppressHydrationWarning>
      <head>
        <meta name="theme-color" content="#050609" />
        <link rel="apple-touch-icon" href="/icons/icon-192x192.png" />
      </head>
      <body className="min-h-screen flex flex-col bg-[var(--bg)] text-[var(--text)] font-sans antialiased">
        <ServiceWorkerRegister />
        <DynamicBranding />
        <ThemeProvider>
          {children}
          <Toaster
            position="top-center"
            gap={8}
            toastOptions={{
              style: {
                background: "var(--sheet)",
                color: "var(--text)",
                border: "1px solid var(--glass-border-strong)",
                borderRadius: "16px",
                fontFamily: "var(--font)",
              },
            }}
          />
        </ThemeProvider>
      </body>
    </html>
  );
}
