"use server";

import { redirect } from "next/navigation";
import { createClient } from "@/lib/supabase/server";

export async function validateMatch(matchId: string, redirectTo: string, _formData: FormData) {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) redirect("/login");

  const { error } = await supabase.rpc("validate_match", {
    p_match_id: matchId,
  });

  if (error) {
    redirect(`/matchs/${matchId}?error=${encodeURIComponent(error.message)}`);
  }

  redirect(redirectTo);
}
