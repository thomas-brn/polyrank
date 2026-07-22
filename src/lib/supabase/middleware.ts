import { createServerClient } from "@supabase/ssr";
import { NextResponse, type NextRequest } from "next/server";

import { SUPABASE_ANON_KEY, SUPABASE_URL, isSupabaseConfigured } from "./config";

/**
 * Rafraîchit la session Supabase à chaque requête et propage les cookies.
 * À appeler depuis le middleware Next.js. No-op si Supabase n'est pas configuré.
 */
export async function updateSession(request: NextRequest) {
  let supabaseResponse = NextResponse.next({ request });

  if (!isSupabaseConfigured) {
    return supabaseResponse;
  }

  // Next.js préfetche les <Link> (au survol / dans le viewport) : chaque
  // préfetch traverse le proxy et déclencherait un getUser() = un aller-retour
  // vers Supabase Auth. Comme un préfetch est spéculatif et ne doit pas
  // rafraîchir la session, on le court-circuite ; la vraie navigation, elle,
  // rafraîchira le token normalement.
  const isPrefetch =
    request.headers.get("next-router-prefetch") === "1" ||
    request.headers.get("purpose") === "prefetch" ||
    (request.headers.get("sec-purpose") ?? "").includes("prefetch");
  if (isPrefetch) {
    return supabaseResponse;
  }

  const supabase = createServerClient(SUPABASE_URL, SUPABASE_ANON_KEY, {
    cookies: {
      getAll() {
        return request.cookies.getAll();
      },
      setAll(cookiesToSet) {
        cookiesToSet.forEach(({ name, value }) =>
          request.cookies.set(name, value),
        );
        supabaseResponse = NextResponse.next({ request });
        cookiesToSet.forEach(({ name, value, options }) =>
          supabaseResponse.cookies.set(name, value, options),
        );
      },
    },
  });

  // Important : ne rien exécuter entre createServerClient et getUser(),
  // sous peine de déconnexions aléatoires.
  await supabase.auth.getUser();

  return supabaseResponse;
}
