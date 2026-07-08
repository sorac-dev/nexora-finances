import type { Metadata, Viewport } from "next";
import { Geist, Geist_Mono } from "next/font/google";
import "./globals.css";
import { ThemeProvider } from "@/src/components/layout/theme-provider";
import { ServiceWorkerRegister } from "@/src/components/layout/sw-register";
import { DynamicBranding } from "@/src/components/layout/dynamic-branding";
import { Toaster } from "sonner";
import { APP_NAME } from "@/src/lib/constants";

const geistSans = Geist({
  variable: "--font-geist-sans",
  subsets: ["latin"],
});

const geistMono = Geist_Mono({
  variable: "--font-geist-mono",
  subsets: ["latin"],
});

export const metadata: Metadata = {
  title: APP_NAME,
  description: "Control financiero personal — simple, elegante, inteligente.",
  manifest: "/manifest.json",
  appleWebApp: {
    capable: true,
    statusBarStyle: "black-translucent",
    title: APP_NAME,
  },
  applicationName: APP_NAME,
  formatDetection: {
    telephone: false,
  },
};

export const viewport: Viewport = {
  themeColor: "#050609",
  width: "device-width",
  initialScale: 1,
  maximumScale: 1,
  userScalable: false,
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="es" className={`${geistSans.variable} ${geistMono.variable}`} suppressHydrationWarning>
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
