import { notFound, redirect } from "next/navigation";
import Link from "next/link";
import { ArrowLeft } from "lucide-react";

import { isSupabaseConfigured } from "@/lib/supabase/config";
import { createClient } from "@/lib/supabase/server";
import { PageHeader } from "@/components/page-header";
import { DeletionForm } from "./deletion-form";

type Participant = {
  side: "A" | "B";
  is_creator: boolean;
  profile_id: string | null;
};

type MatchRow = {
  id: string;
  status: string;
  match_participants: Participant[];
};

export default async function SupprimerMatchPage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const { id } = await params;

  if (!isSupabaseConfigured) redirect("/matchs");

  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) redirect("/login");

  const { data: match } = await supabase
    .from("matches")
    .select("id, status, match_participants(side, is_creator, profile_id)")
    .eq("id", id)
    .single<MatchRow>();

  if (!match) notFound();

  // Seul un joueur tagué côté adverse peut demander la suppression d'un match VALIDE
  if (match.status !== "VALIDE") redirect(`/matchs/${id}`);

  const creatorSide =
    match.match_participants.find((p) => p.is_creator)?.side ?? "A";
  const isTaggedOpponent = match.match_participants.some(
    (p) => p.profile_id === user.id && p.side !== creatorSide,
  );

  if (!isTaggedOpponent) redirect(`/matchs/${id}`);

  return (
    <div className="flex flex-col gap-4">
      <div>
        <Link
          href={`/matchs/${id}`}
          className="inline-flex items-center gap-1 text-sm text-slate-500 hover:text-slate-700"
        >
          <ArrowLeft className="size-4" /> Retour au match
        </Link>
      </div>

      <PageHeader title="Demander la suppression" />

      <p className="text-sm text-slate-600">
        Si ce match ne devrait pas exister (jamais joué, doublon, erreur...), tu
        peux demander sa suppression. Contrairement à une contestation, c&apos;est
        un admin qui tranchera, pas le créateur.
      </p>

      <DeletionForm matchId={match.id} />
    </div>
  );
}
