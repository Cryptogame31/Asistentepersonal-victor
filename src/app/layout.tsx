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
      <body className="antialiased text-gray-100 bg-[#030712] min-h-screen">
        {children}
      </body>
    </html>
  );
}
