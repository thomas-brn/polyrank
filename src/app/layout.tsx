import type { Metadata } from "next";
import { Geist, Geist_Mono } from "next/font/google";

import { BottomNav, SideNav } from "@/components/site-nav";
import { getMode } from "@/lib/mode";
import { isSupabaseConfigured } from "@/lib/supabase/config";
import { createClient } from "@/lib/supabase/server";
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

async function getPendingValidationCount(): Promise<number> {
  if (!isSupabaseConfigured) return 0;
  try {
    const supabase = await createClient();
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) return 0;

    const { data: matches } = await supabase
      .from("matches")
      .select("id, match_participants(profile_id, side, is_creator)")
      .in("status", ["SOUMIS", "MODIFIE"]);

    if (!matches) return 0;

    return matches.filter((match) => {
      const participants = match.match_participants as { profile_id: string | null; side: string; is_creator: boolean }[];
      const creatorSide = participants.find((p) => p.is_creator)?.side;
      const userParticipant = participants.find((p) => p.profile_id === user.id);
      return userParticipant && creatorSide && userParticipant.side !== creatorSide;
    }).length;
  } catch {
    return 0;
  }
}

export default async function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  const [mode, pendingCount] = await Promise.all([getMode(), getPendingValidationCount()]);

  return (
    <html
      lang="fr"
      data-mode={mode}
      className={`${geistSans.variable} ${geistMono.variable} h-full antialiased`}
    >
      <body className="flex min-h-full flex-col font-sans">
        <SideNav pendingCount={pendingCount} />
        <main className="mx-auto w-full max-w-3xl flex-1 px-4 pt-6 pb-24 md:pb-12 md:pl-24 lg:pl-4">
          {children}
        </main>
        <BottomNav pendingCount={pendingCount} />
      </body>
    </html>
  );
}
