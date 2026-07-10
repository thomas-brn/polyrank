import { NextResponse } from "next/server";

import { createClient } from "@/lib/supabase/server";

// Réception du lien magique : Supabase redirige ici avec un `code`,
// qu'on échange contre une session (cookies), puis on file vers l'onboarding.
// N'accepte qu'un chemin relatif interne comme cible de redirection, pour
// éviter un open redirect (ex. `next=@evil.com` → `${origin}@evil.com` pointe
// vers evil.com). On rejette tout ce qui n'est pas un `/chemin` non protocolaire.
function safeNext(raw: string | null): string {
  if (!raw || !raw.startsWith("/") || raw.startsWith("//") || raw.startsWith("/\\")) {
    return "/inscription";
  }
  return raw;
}

export async function GET(request: Request) {
  const { searchParams, origin } = new URL(request.url);
  const code = searchParams.get("code");
  const next = safeNext(searchParams.get("next"));

  if (code) {
    const supabase = await createClient();
    const { error } = await supabase.auth.exchangeCodeForSession(code);
    if (!error) {
      return NextResponse.redirect(`${origin}${next}`);
    }
  }

  return NextResponse.redirect(`${origin}/login?error=lien_invalide`);
}
