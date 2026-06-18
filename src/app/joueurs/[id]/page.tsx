import { notFound, redirect } from "next/navigation";

import { PageHeader } from "@/components/page-header";
import { ANNEE_LABELS } from "@/lib/constants";
import { isSupabaseConfigured } from "@/lib/supabase/config";
import { createClient } from "@/lib/supabase/server";

type ProfileRow = {
  id: string;
  pseudo: string | null;
  annee: string | null;
  is_external: boolean;
  schools: { name: string } | null;
};

type PartRow = {
  match_id: string;
  side: "A" | "B";
  matches: {
    winner_side: "A" | "B" | "NUL";
    games: { name: string } | null;
  } | null;
};

type CoPartRow = {
  match_id: string;
  side: "A" | "B";
  profile_id: string | null;
  guest_name: string | null;
  profiles: { pseudo: string | null } | null;
};

export default async function JoueurPage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const { id } = await params;
  if (!isSupabaseConfigured) {
    redirect("/");
  }

  const supabase = await createClient();

  const { data: profile } = await supabase
    .from("profiles")
    .select("id, pseudo, annee, is_external, schools(name)")
    .eq("id", id)
    .single<ProfileRow>();

  if (!profile) {
    notFound();
  }

  // Participations du joueur.
  const { data: parts } = await supabase
    .from("match_participants")
    .select("match_id, side, matches(winner_side, games(name))")
    .eq("profile_id", id)
    .returns<PartRow[]>();

  const myParts = parts ?? [];
  const totalMatches = myParts.length;
  const wins = myParts.filter((p) => p.matches?.winner_side === p.side).length;

  const perGame = new Map<string, number>();
  for (const p of myParts) {
    const name = p.matches?.games?.name ?? "Autre";
    perGame.set(name, (perGame.get(name) ?? 0) + 1);
  }

  // Coéquipiers les plus fréquents (même côté).
  const sideByMatch = new Map<string, "A" | "B">();
  myParts.forEach((p) => sideByMatch.set(p.match_id, p.side));
  const matchIds = [...sideByMatch.keys()];

  const teammates: { label: string; count: number }[] = [];
  if (matchIds.length > 0) {
    const { data: coParts } = await supabase
      .from("match_participants")
      .select("match_id, side, profile_id, guest_name, profiles(pseudo)")
      .in("match_id", matchIds)
      .returns<CoPartRow[]>();

    const counts = new Map<string, number>();
    for (const c of coParts ?? []) {
      if (sideByMatch.get(c.match_id) !== c.side) continue;
      if (c.profile_id === id) continue;
      const label = c.profiles?.pseudo ?? c.guest_name ?? "?";
      counts.set(label, (counts.get(label) ?? 0) + 1);
    }
    teammates.push(
      ...[...counts.entries()]
        .map(([label, count]) => ({ label, count }))
        .sort((a, b) => b.count - a.count)
        .slice(0, 3),
    );
  }

  // Anciens pseudos.
  const { data: history } = await supabase
    .from("pseudo_history")
    .select("pseudo, changed_at")
    .eq("profile_id", id)
    .order("changed_at", { ascending: false });

  const ecole = profile.is_external
    ? "Exté"
    : (profile.schools?.name ?? "-");
  const anneeLabel = profile.annee ? ANNEE_LABELS[profile.annee] : null;

  return (
    <div>
      <PageHeader title={profile.pseudo ?? "Joueur"} />

      {history && history.length > 0 ? (
        <details className="mb-6 -mt-3">
          <summary className="cursor-pointer text-xs text-slate-500 hover:text-slate-700">
            Anciens pseudos ({history.length})
          </summary>
          <ul className="mt-2 flex flex-col gap-1 text-sm text-slate-600">
            {history.map((h, i) => (
              <li key={i}>
                {h.pseudo}{" "}
                <span className="text-xs text-slate-400">
                  (jusqu&apos;au{" "}
                  {new Date(h.changed_at).toLocaleDateString("fr-FR")})
                </span>
              </li>
            ))}
          </ul>
        </details>
      ) : null}

      <dl className="grid grid-cols-2 gap-px overflow-hidden rounded-xl border border-slate-200 bg-slate-200 text-sm sm:grid-cols-4">
        <Stat label="École" value={ecole} />
        <Stat label="Année" value={anneeLabel ?? "-"} />
        <Stat label="Matchs" value={String(totalMatches)} />
        <Stat label="Victoires" value={String(wins)} />
      </dl>

      <section className="mt-6">
        <h2 className="text-sm font-semibold text-slate-700">Par jeu</h2>
        {perGame.size === 0 ? (
          <p className="mt-2 text-sm text-slate-400">Aucun match.</p>
        ) : (
          <ul className="mt-2 flex flex-col gap-2">
            {[...perGame.entries()].map(([name, count]) => (
              <li
                key={name}
                className="flex justify-between rounded-lg border border-slate-200 bg-white px-4 py-2 text-sm"
              >
                <span>{name}</span>
                <span className="font-medium">{count}</span>
              </li>
            ))}
          </ul>
        )}
      </section>

      <section className="mt-6">
        <h2 className="text-sm font-semibold text-slate-700">
          Coéquipiers les plus fréquents
        </h2>
        {teammates.length === 0 ? (
          <p className="mt-2 text-sm text-slate-400">Personne pour l&apos;instant.</p>
        ) : (
          <ul className="mt-2 flex flex-col gap-2">
            {teammates.map((t) => (
              <li
                key={t.label}
                className="flex justify-between rounded-lg border border-slate-200 bg-white px-4 py-2 text-sm"
              >
                <span>{t.label}</span>
                <span className="text-slate-500">{t.count} match(s)</span>
              </li>
            ))}
          </ul>
        )}
      </section>
    </div>
  );
}

function Stat({ label, value }: { label: string; value: string }) {
  return (
    <div className="bg-white p-4">
      <dt className="text-xs text-slate-500">{label}</dt>
      <dd className="mt-1 font-medium">{value}</dd>
    </div>
  );
}
