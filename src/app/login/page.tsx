"use client";

import { useState } from "react";

import { ComingSoon, PageHeader } from "@/components/page-header";
import { createClient } from "@/lib/supabase/client";
import { isSupabaseConfigured } from "@/lib/supabase/config";

export default function LoginPage() {
  const [email, setEmail] = useState("");
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [sent, setSent] = useState(false);

  if (!isSupabaseConfigured) {
    return (
      <div>
        <PageHeader title="Connexion" />
        <ComingSoon>
          Authentification non configurée. Renseigne tes clés Supabase dans
          <code className="mx-1 rounded bg-slate-100 px-1">.env.local</code>
          (voir le README) pour activer la connexion.
        </ComingSoon>
      </div>
    );
  }

  async function handleSubmit(event: React.FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setLoading(true);
    setError(null);

    const supabase = createClient();
    const { error: otpError } = await supabase.auth.signInWithOtp({
      email,
      options: {
        shouldCreateUser: true,
        emailRedirectTo: `${window.location.origin}/auth/callback`,
      },
    });

    setLoading(false);

    if (otpError) {
      setError(otpError.message);
      return;
    }

    setSent(true);
  }

  if (sent) {
    return (
      <div className="mx-auto max-w-sm">
        <PageHeader title="Vérifie tes mails" />
        <div className="rounded-xl border border-slate-200 bg-white p-6 text-sm text-slate-600">
          <p>
            On t&apos;a envoyé un lien de connexion à{" "}
            <strong className="text-slate-900">{email}</strong>.
          </p>
          <p className="mt-2">
            Ouvre-le <strong>sur cet appareil</strong> pour finaliser la
            connexion. Pense à vérifier tes spams.
          </p>
        </div>
      </div>
    );
  }

  return (
    <div className="mx-auto max-w-sm">
      <PageHeader
        title="Connexion"
        subtitle="Reçois un lien de connexion par email."
      />
      <form
        onSubmit={handleSubmit}
        className="rounded-xl border border-slate-200 bg-white p-6"
      >
        <label htmlFor="email" className="block text-sm font-medium">
          Adresse email
        </label>
        <input
          id="email"
          type="email"
          required
          autoComplete="email"
          value={email}
          onChange={(event) => setEmail(event.target.value)}
          placeholder="prenom.nom@etu.polytech.fr"
          className="mt-1 w-full rounded-lg border border-slate-300 px-3 py-2 text-sm outline-none focus:border-blue-500 focus:ring-2 focus:ring-blue-200"
        />

        {error ? <p className="mt-3 text-sm text-red-600">{error}</p> : null}

        <button
          type="submit"
          disabled={loading}
          className="mt-4 w-full rounded-lg bg-blue-600 px-4 py-2 text-sm font-semibold text-white transition-colors hover:bg-blue-700 disabled:opacity-60"
        >
          {loading ? "Envoi…" : "Recevoir le lien"}
        </button>
      </form>
    </div>
  );
}
