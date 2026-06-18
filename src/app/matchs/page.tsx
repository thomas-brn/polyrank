import Link from "next/link";
import { PlusCircle } from "lucide-react";

import { ComingSoon, PageHeader } from "@/components/page-header";
import { isSupabaseConfigured } from "@/lib/supabase/config";
import { createClient } from "@/lib/supabase/server";

type Participant = {
  side: "A" | "B";
  is_creator: boolean;
  guest_name: string | null;
  profiles: { pseudo: string | null } | null;
};

type MatchRow = {
  id: string;
  format: string;
  status: string;
  winner_side: "A" | "B" | "NUL";
  score_a: number | null;
  score_b: number | null;
  played_at: string;
  games: { name: string; has_score: boolean } | null;
  match_participants: Participant[];
};

const STATUS: Record<string, { label: string; className: string }> = {
  SOUMIS: { label: "En attente", className: "bg-amber-100 text-amber-700" },
  VALIDE: { label: "Validé", className: "bg-green-100 text-green-700" },
  REVALIDE: { label: "Validé", className: "bg-green-100 text-green-700" },
  MODIFIE: { label: "Modifié", className: "bg-amber-100 text-amber-700" },
  CONTESTE: { label: "Contesté", className: "bg-red-100 text-red-700" },
};

function names(participants: Participant[], side: "A" | "B") {
  const list = participants
    .filter((p) => p.side === side)
    .map((p) => p.profiles?.pseudo ?? p.guest_name ?? "?");
  return list.length ? list.join(" & ") : "?";
}

function MatchCard({ match }: { match: MatchRow }) {
  const status = STATUS[match.status] ?? {
    label: match.status,
    className: "bg-slate-100 text-slate-600",
  };
  const aWins = match.winner_side === "A";
  const bWins = match.winner_side === "B";
  const date = new Date(match.played_at).toLocaleDateString("fr-FR", {
    day: "2-digit",
    month: "short",
  });

  return (
    <li className="rounded-xl border border-slate-200 bg-white p-4">
      <div className="flex items-center justify-between text-xs text-slate-500">
        <span>
          {match.games?.name} · {match.format.toLowerCase()}
        </span>
        <span className={`rounded-full px-2 py-0.5 font-medium ${status.className}`}>
          {status.label}
        </span>
      </div>

      <div className="mt-2 flex items-center justify-between gap-3">
        <span className={`flex-1 text-sm ${aWins ? "font-bold" : ""}`}>
          {names(match.match_participants, "A")}
          {aWins ? " 🏆" : ""}
        </span>
        <span className="shrink-0 text-sm font-semibold text-slate-700">
          {match.games?.has_score
            ? `${match.score_a ?? 0} - ${match.score_b ?? 0}`
            : "vs"}
        </span>
        <span className={`flex-1 text-right text-sm ${bWins ? "font-bold" : ""}`}>
          {bWins ? "🏆 " : ""}
          {names(match.match_participants, "B")}
        </span>
      </div>

      <p className="mt-2 text-right text-xs text-slate-400">{date}</p>
    </li>
  );
}

export default async function MatchsPage() {
  if (!isSupabaseConfigured) {
    return (
      <div>
        <PageHeader title="Matchs" />
        <ComingSoon>Authentification non configurée (voir le README).</ComingSoon>
      </div>
    );
  }

  const supabase = await createClient();
  const { data: matches } = await supabase
    .from("matches")
    .select(
      "id, format, status, winner_side, score_a, score_b, played_at, games(name, has_score), match_participants(side, is_creator, guest_name, profiles(pseudo))",
    )
    .order("played_at", { ascending: false })
    .limit(50)
    .returns<MatchRow[]>();

  return (
    <div>
      <div className="mb-6 flex items-center justify-between">
        <PageHeader title="Matchs" subtitle="Les derniers résultats." />
        <Link
          href="/matchs/nouveau"
          className="inline-flex shrink-0 items-center gap-1.5 rounded-lg bg-blue-600 px-3 py-2 text-sm font-semibold text-white transition-colors hover:bg-blue-700"
        >
          <PlusCircle className="size-4" aria-hidden />
          Nouveau
        </Link>
      </div>

      {!matches || matches.length === 0 ? (
        <ComingSoon>
          Aucun match pour l&apos;instant. Sois le premier à en saisir un !
        </ComingSoon>
      ) : (
        <ul className="flex flex-col gap-3">
          {matches.map((match) => (
            <MatchCard key={match.id} match={match} />
          ))}
        </ul>
      )}
    </div>
  );
}
