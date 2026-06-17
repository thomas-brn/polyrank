// Configuration Supabase, partagée client + serveur.
// Les variables NEXT_PUBLIC_* sont injectées au build ; si elles sont absentes,
// l'app démarre quand même (pages publiques) mais l'authentification est désactivée.

export const SUPABASE_URL = process.env.NEXT_PUBLIC_SUPABASE_URL ?? "";
export const SUPABASE_ANON_KEY = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY ?? "";

/** true uniquement si l'URL et la clé anonyme sont présentes. */
export const isSupabaseConfigured = Boolean(SUPABASE_URL && SUPABASE_ANON_KEY);
