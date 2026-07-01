import Link from "next/link";
import { redirect } from "next/navigation";
import { ArrowRight, Flag, Trash2 } from "lucide-react";

import { PageHero } from "@/components/page-hero";
import { isSupabaseConfigured } from "@/lib/supabase/config";
import { createClient } from "@/lib/supabase/server";
import { approveDeletion, rejectDeletion } from "@/app/matchs/[id]/actions";

type Participant = {
  side: "A" | "B";
  is_creator: boolean;
  guest_name: string | null;
  profile_id: string | null;
  profiles: { pseudo: string | null } | null;
};

type ProposedChanges = { action?: "DELETE"; reason?: string } | null;

type AppealMatch = {
  id: string;
  format: string;
  played_at: string;
  proposed_changes: ProposedChanges;
  games: { name: string } | null;
  match_participants: Participant[];
};

function sideLabel(participants: Participant[], side: "A" | "B"): string {
  return (
    participants
      .filter((p) => p.side === side)
      .map((p) => p.profiles?.pseudo ?? p.guest_name ?? "?")
      .join(" & ") || "?"
  );
}

export default async function AdminPage() {
  if (!isSupabaseConfigured) redirect("/");

  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) redirect("/login");

  const { data: viewer } = await supabase
    .from("profiles")
    .select("is_admin")
    .eq("id", user.id)
    .single<{ is_admin: boolean }>();

  if (!viewer?.is_admin) redirect("/");

  const { data: appeals } = await supabase
    .from("matches")
    .select(
      "id, format, played_at, proposed_changes, games(name), match_participants(side, is_creator, guest_name, profile_id, profiles(pseudo))",
    )
    .eq("status", "EN_APPEL")
    .order("updated_at", { ascending: true })
    .returns<AppealMatch[]>();

  const litiges = appeals ?? [];

  return (
    <div className="flex flex-col gap-6">
      <PageHero
        title="Administration"
        description="Arbitrage des matchs litigieux."
      />

      <section className="flex flex-col gap-3">
        <h2 className="text-sm font-semibold text-slate-700">
          Matchs en appel ({litiges.length})
        </h2>

        {litiges.length === 0 ? (
          <p className="rounded-xl border border-slate-200 bg-white p-6 text-sm text-slate-500">
            Aucun litige en attente. 🎉
          </p>
        ) : (
          <ul className="flex flex-col gap-3">
            {litiges.map((m) => {
              const isDeletion = m.proposed_changes?.action === "DELETE";
              const reason = m.proposed_changes?.reason;
              const boundApprove = approveDeletion.bind(null, m.id);
              const boundReject = rejectDeletion.bind(null, m.id);
              const date = new Date(m.played_at).toLocaleDateString("fr-FR", {
                day: "2-digit",
                month: "short",
                year: "numeric",
              });

              return (
                <li
                  key={m.id}
                  className="rounded-xl border border-slate-200 bg-white p-4 flex flex-col gap-3"
                >
                  <div className="flex items-center justify-between">
                    <span className="text-[12px] font-medium uppercase tracking-[0.04em] text-slate-400">
                      {m.games?.name} · {m.format} · {date}
                    </span>
                    <span
                      className={`inline-flex items-center gap-1 rounded-full px-2 py-0.5 text-[11px] font-medium ${isDeletion ? "bg-amber-100 text-amber-700" : "bg-red-100 text-red-700"}`}
                    >
                      {isDeletion ? (
                        <>
                          <Trash2 className="size-3" /> Suppression
                        </>
                      ) : (
                        <>
                          <Flag className="size-3" /> Contestation
                        </>
                      )}
                    </span>
                  </div>

                  <p className="text-sm font-medium text-slate-800">
                    {sideLabel(m.match_participants, "A")}{" "}
                    <span className="text-slate-400">vs</span>{" "}
                    {sideLabel(m.match_participants, "B")}
                  </p>

                  {reason ? (
                    <p className="rounded-lg bg-slate-50 px-3 py-2 text-xs text-slate-600">
                      Motif : « {reason} »
                    </p>
                  ) : null}

                  <div className="flex flex-wrap items-center gap-2">
                    <form action={boundApprove}>
                      <button
                        type="submit"
                        className="rounded-lg bg-red-600 px-3 py-1.5 text-sm font-medium text-white hover:bg-red-700"
                      >
                        Supprimer le match
                      </button>
                    </form>
                    <form action={boundReject}>
                      <button
                        type="submit"
                        className="rounded-lg border border-slate-300 px-3 py-1.5 text-sm font-medium text-slate-700 hover:bg-slate-100"
                      >
                        Rejeter, garder le match
                      </button>
                    </form>
                    <Link
                      href={`/matchs/${m.id}`}
                      className="ml-auto inline-flex items-center gap-1 text-sm text-brand-600 hover:underline"
                    >
                      Voir le match <ArrowRight className="size-3.5" />
                    </Link>
                  </div>
                </li>
              );
            })}
          </ul>
        )}
      </section>
    </div>
  );
}
