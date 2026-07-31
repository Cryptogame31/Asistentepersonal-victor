import type { Metadata } from "next";
import { Outfit } from "next/font/google";
import "./globals.css";

const outfit = Outfit({
  subsets: ["latin"],
  variable: "--font-outfit",
});

export const metadata: Metadata = {
  title: "Bitácora Inteligente - Asistente Personal",
  description: "Captura ideas, citas, proyectos y planea tu tiempo libre de forma automatizada con IA y Telegram.",
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="es" className={`${outfit.className} dark`}>
      <head>
        <link rel="manifest" href="/manifest.json" />
        <meta name="theme-color" content="#8b5cf6" />
        <meta name="apple-mobile-web-app-capable" content="yes" />
        <meta name="apple-mobile-web-app-status-bar-style" content="default" />
        <meta name="apple-mobile-web-app-title" content="Bitácora AI" />
        <link rel="apple-touch-icon" href="/icon.png" />
      </head>
      <body className="antialiased text-gray-100 bg-[#030712] min-h-screen">
        {children}
      </body>
    </html>
  );
}
