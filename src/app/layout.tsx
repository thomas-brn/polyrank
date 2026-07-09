import type { Metadata, Viewport } from "next";
import { Geist, Geist_Mono } from "next/font/google";

import { BottomNav, SideNav } from "@/components/site-nav";
import { getMode } from "@/lib/mode";
import "./globals.css";
import "katex/dist/katex.min.css";

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

export const viewport: Viewport = {
  width: "device-width",
  initialScale: 1,
};

export default async function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  const mode = await getMode();

  return (
    <html
      lang="fr"
      data-mode={mode}
      className={`${geistSans.variable} ${geistMono.variable} h-full antialiased`}
    >
      <body
        className="flex min-h-full flex-col overflow-x-hidden font-sans"
        suppressHydrationWarning
      >
        <SideNav />
        <main className="mx-auto w-full max-w-3xl flex-1 px-4 pt-6 pb-24 md:pb-12 md:pl-24 lg:pl-4">
          {children}
        </main>
        <BottomNav />
      </body>
    </html>
  );
}
