import { NextResponse } from "next/server";

import { createClient } from "@/lib/supabase/server";

// Réception du lien magique : Supabase redirige ici avec un `code`,
// qu'on échange contre une session (cookies), puis on file vers l'onboarding.
export async function GET(request: Request) {
  const { searchParams, origin } = new URL(request.url);
  const code = searchParams.get("code");
  const next = searchParams.get("next") ?? "/inscription";

  if (code) {
    const supabase = await createClient();
    const { error } = await supabase.auth.exchangeCodeForSession(code);
    if (!error) {
      return NextResponse.redirect(`${origin}${next}`);
    }
  }

  return NextResponse.redirect(`${origin}/login?error=lien_invalide`);
}
