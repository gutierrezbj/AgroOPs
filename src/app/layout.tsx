import type { Metadata } from "next";
import "./globals.css";

export const metadata: Metadata = {
  title: {
    default: "AgroOps",
    template: "%s · AgroOps",
  },
  description: "Sistema de operaciones UAS para aplicación fitosanitaria",
  icons: {
    icon: "/favicon.svg",
  },
};

/**
 * AgroOps — RootLayout
 *
 * Tipografía oficial del ecosistema FitoLink → AgroM → AgroOps (decisión
 * JuanCho 13-may-2026, Identity v0.2):
 * - Display: Instrument Serif (ital@0;1 para legales/editoriales en cursiva)
 * - Body:    DM Sans (400-700)
 * - Mono:    IBM Plex Mono (400-600) — eyebrows técnicos `§ 01 · …`
 *
 * Fonts servidas vía <link> directo a Google Fonts (no @import en CSS para
 * que el navegador las priorice). preconnect a fonts.googleapis.com +
 * fonts.gstatic.com con crossOrigin reduce el handshake inicial.
 */
export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="es" className="h-full antialiased">
      <head>
        <link rel="preconnect" href="https://fonts.googleapis.com" />
        <link
          rel="preconnect"
          href="https://fonts.gstatic.com"
          crossOrigin="anonymous"
        />
        <link
          rel="stylesheet"
          href="https://fonts.googleapis.com/css2?family=DM+Sans:ital,wght@0,400;0,500;0,600;0,700;1,400&family=Instrument+Serif:ital@0;1&family=IBM+Plex+Mono:wght@400;500;600&display=swap"
        />
      </head>
      <body className="min-h-full flex flex-col">{children}</body>
    </html>
  );
}
