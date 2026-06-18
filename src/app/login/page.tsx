"use client";

import { useRouter } from "next/navigation";
import { useState } from "react";

import { ComingSoon, PageHeader } from "@/components/page-header";
import { createClient } from "@/lib/supabase/client";
import { isSupabaseConfigured } from "@/lib/supabase/config";

export default function LoginPage() {
  const router = useRouter();
  const [email, setEmail] = useState("");
  const [code, setCode] = useState("");
  const [step, setStep] = useState<"email" | "code">("email");
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

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

  async function handleEmailSubmit(event: React.FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setLoading(true);
    setError(null);

    const supabase = createClient();
    const { error: otpError } = await supabase.auth.signInWithOtp({
      email,
      options: { shouldCreateUser: true },
    });

    setLoading(false);

    if (otpError) {
      setError(otpError.message);
      return;
    }

    setStep("code");
  }

  async function handleCodeSubmit(event: React.FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setLoading(true);
    setError(null);

    const supabase = createClient();
    const { error: verifyError } = await supabase.auth.verifyOtp({
      email,
      token: code.trim(),
      type: "email",
    });

    setLoading(false);

    if (verifyError) {
      setError("Code invalide ou expiré. Réessaie.");
      return;
    }

    router.push("/inscription");
  }

  if (step === "code") {
    return (
      <div className="mx-auto max-w-sm">
        <PageHeader
          title="Saisis le code"
          subtitle={`Code envoyé à ${email}. Vérifie tes spams.`}
        />
        <form
          onSubmit={handleCodeSubmit}
          className="rounded-xl border border-slate-200 bg-white p-6"
        >
          <label htmlFor="code" className="block text-sm font-medium">
            Code à 6 chiffres
          </label>
          <input
            id="code"
            type="text"
            inputMode="numeric"
            autoComplete="one-time-code"
            required
            maxLength={6}
            value={code}
            onChange={(e) => setCode(e.target.value.replace(/\D/g, ""))}
            placeholder="123456"
            className="mt-1 w-full rounded-lg border border-slate-300 px-3 py-2 text-center text-xl font-mono tracking-widest outline-none focus:border-blue-500 focus:ring-2 focus:ring-blue-200"
          />

          {error ? <p className="mt-3 text-sm text-red-600">{error}</p> : null}

          <button
            type="submit"
            disabled={loading || code.length < 6}
            className="mt-4 w-full rounded-lg bg-blue-600 px-4 py-2 text-sm font-semibold text-white transition-colors hover:bg-blue-700 disabled:opacity-60"
          >
            {loading ? "Vérification…" : "Se connecter"}
          </button>

          <button
            type="button"
            onClick={() => {
              setStep("email");
              setCode("");
              setError(null);
            }}
            className="mt-3 w-full text-center text-xs text-slate-500 hover:underline"
          >
            Changer d&apos;adresse email
          </button>
        </form>
      </div>
    );
  }

  return (
    <div className="mx-auto max-w-sm">
      <PageHeader
        title="Connexion"
        subtitle="Reçois un code de connexion par email."
      />
      <form
        onSubmit={handleEmailSubmit}
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
          onChange={(e) => setEmail(e.target.value)}
          placeholder="prenom.nom@etu.polytech.fr"
          className="mt-1 w-full rounded-lg border border-slate-300 px-3 py-2 text-sm outline-none focus:border-blue-500 focus:ring-2 focus:ring-blue-200"
        />

        {error ? <p className="mt-3 text-sm text-red-600">{error}</p> : null}

        <button
          type="submit"
          disabled={loading}
          className="mt-4 w-full rounded-lg bg-blue-600 px-4 py-2 text-sm font-semibold text-white transition-colors hover:bg-blue-700 disabled:opacity-60"
        >
          {loading ? "Envoi…" : "Recevoir le code"}
        </button>
      </form>
    </div>
  );
}
