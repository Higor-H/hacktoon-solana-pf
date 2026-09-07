import type { Metadata } from "next";
import { Space_Mono, Inter } from "next/font/google";
import "./globals.css";

const spaceMono = Space_Mono({
  variable: "--font-space-mono",
  subsets: ["latin"],
  weight: ["400", "700"],
});

const inter = Inter({
  variable: "--font-inter",
  subsets: ["latin"],
});

export const metadata: Metadata = {
  title: "MESTRE | Sistema de Votação",
  description: "Sistema de votação transparente e imutável com Solana",
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="pt-BR">
      <body
        className={`${spaceMono.variable} ${inter.variable} antialiased`}
      >
        <main className="min-h-screen p-4 md:p-8 flex flex-col max-w-7xl mx-auto">
          {children}
        </main>
      </body>
    </html>
  );
}
