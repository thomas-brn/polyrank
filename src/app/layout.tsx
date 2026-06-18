import type { Metadata } from "next";
import { Geist, Geist_Mono } from "next/font/google";

import { BottomNav, TopNav } from "@/components/site-nav";
import "./globals.css";

const geistSans = Geist({
  variable: "--font-geist-sans",
  subsets: ["latin"],
});

const geistMono = Geist_Mono({
  variable: "--font-geist-mono",
  subsets: ["latin"],
});

export const metadata: Metadata = {
  title: "PolyRank · Classements de jeux étudiants",
  description:
    "Saisis tes résultats de matchs et suis les classements par jeu et par école.",
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html
      lang="fr"
      className={`${geistSans.variable} ${geistMono.variable} h-full antialiased`}
    >
      <body className="flex min-h-full flex-col font-sans">
        <TopNav />
        <main className="mx-auto w-full max-w-3xl flex-1 px-4 pt-6 pb-24 md:pb-12">
          {children}
        </main>
        <BottomNav />
      </body>
    </html>
  );
}
