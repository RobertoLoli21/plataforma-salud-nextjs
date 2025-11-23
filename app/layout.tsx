//app/layout.tsx
import type { Metadata } from "next";
import { Geist, Geist_Mono } from "next/font/google";
import "./globals.css";
import RegisterServiceWorker from '@/components/RegisterServiceWorker';

const geistSans = Geist({
  variable: "--font-geist-sans",
  subsets: ["latin"],
});

const geistMono = Geist_Mono({
  variable: "--font-geist-mono",
  subsets: ["latin"],
});

export const metadata: Metadata = {
  title: "Plataforma Salud",
  description: "Sistema de Control de Anemia",
  manifest: "/manifest.json", // ✅ Ya lo tienes
  themeColor: "#2563eb", // ✅ Ya lo tienes
  viewport: "width=device-width, initial-scale=1, maximum-scale=1", // ✅ Ya lo tienes
  // 🆕 Agregar estos:
  appleWebApp: {
    capable: true,
    statusBarStyle: "default",
    title: "SaludApp",
  },
};

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="en">
      <head>
        {/* Meta tags para PWA */}
        <link rel="manifest" href="/manifest.json" />
        <meta name="theme-color" content="#2563eb" />
        <link rel="apple-touch-icon" href="/icon-192.png" />
      </head>
      <body className={`${geistSans.variable} ${geistMono.variable} antialiased`}>
        <RegisterServiceWorker /> {/* 🆕 Agregar aquí */}
        {children}
      </body>
    </html>
  );
}
