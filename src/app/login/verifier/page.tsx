"use client";

import { Suspense, useState } from "react";
import { useRouter, useSearchParams } from "next/navigation";

import { ComingSoon, PageHeader } from "@/components/page-header";
import { createClient } from "@/lib/supabase/client";
import { isSupabaseConfigured } from "@/lib/supabase/config";

function VerifyForm() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const email = searchParams.get("email") ?? "";

  const [token, setToken] = useState("");
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  async function handleSubmit(event: React.FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setLoading(true);
    setError(null);

    const supabase = createClient();
    const { error: otpError } = await supabase.auth.verifyOtp({
      email,
      token,
      type: "email",
    });

    setLoading(false);

    if (otpError) {
      setError(otpError.message);
      return;
    }

    // Vers l'onboarding : il redirigera vers /profil si le profil est déjà complet.
    router.push("/inscription");
    router.refresh();
  }

  return (
    <form
      onSubmit={handleSubmit}
      className="rounded-xl border border-slate-200 bg-white p-6"
    >
      <p className="text-sm text-slate-600">
        Un code a été envoyé à{" "}
        <span className="font-medium text-slate-900">{email || "ton email"}</span>.
      </p>

      <label htmlFor="token" className="mt-4 block text-sm font-medium">
        Code de vérification
      </label>
      <input
        id="token"
        inputMode="numeric"
        autoComplete="one-time-code"
        required
        value={token}
        onChange={(event) => setToken(event.target.value)}
        placeholder="123456"
        className="mt-1 w-full rounded-lg border border-slate-300 px-3 py-2 text-center text-lg tracking-[0.3em] outline-none focus:border-blue-500 focus:ring-2 focus:ring-blue-200"
      />

      {error ? <p className="mt-3 text-sm text-red-600">{error}</p> : null}

      <button
        type="submit"
        disabled={loading}
        className="mt-4 w-full rounded-lg bg-blue-600 px-4 py-2 text-sm font-semibold text-white transition-colors hover:bg-blue-700 disabled:opacity-60"
      >
        {loading ? "Vérification…" : "Valider"}
      </button>
    </form>
  );
}

export default function VerifierPage() {
  if (!isSupabaseConfigured) {
    return (
      <div className="mx-auto max-w-sm">
        <PageHeader title="Vérification" />
        <ComingSoon>
          Authentification non configurée (voir le README).
        </ComingSoon>
      </div>
    );
  }

  return (
    <div className="mx-auto max-w-sm">
      <PageHeader title="Vérification" subtitle="Saisis le code reçu par email." />
      <Suspense fallback={null}>
        <VerifyForm />
      </Suspense>
    </div>
  );
}
