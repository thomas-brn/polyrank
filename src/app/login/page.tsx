"use client";

import Link from "next/link";
import { useRouter } from "next/navigation";
import { useState } from "react";

import { ComingSoon, PageHeader } from "@/components/page-header";
import { useCooldown } from "@/lib/use-cooldown";
import { createClient } from "@/lib/supabase/client";
import { isSupabaseConfigured } from "@/lib/supabase/config";

const inputClass =
  "mt-1 w-full rounded-lg border border-slate-300 px-3 py-2 text-sm outline-none focus:border-brand-500 focus:ring-2 focus:ring-brand-200";

export default function LoginPage() {
  const router = useRouter();
  const [email, setEmail] = useState("");
  const [code, setCode] = useState("");
  const [step, setStep] = useState<"email" | "code">("email");
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [resent, setResent] = useState(false);
  const [cooldown, startCooldown] = useCooldown(30);

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

  async function handleEmailSubmit(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault();
    setLoading(true);
    setError(null);
    const supabase = createClient();
    // shouldCreateUser:false → pas de code si aucun compte. On avance toujours
    // vers l'étape code sans révéler si l'email correspond à un compte.
    await supabase.auth.signInWithOtp({
      email,
      options: { shouldCreateUser: false },
    });
    setLoading(false);
    startCooldown();
    setStep("code");
  }

  async function handleResend() {
    setLoading(true);
    setError(null);
    setResent(false);
    const supabase = createClient();
    const { error: otpError } = await supabase.auth.signInWithOtp({
      email,
      options: { shouldCreateUser: false },
    });
    setLoading(false);
    // On n'expose pas l'erreur Supabase (anti-énumération) : qu'il y ait un
    // compte ou non, on affiche toujours le même message neutre.
    if (!otpError) setResent(true);
    startCooldown();
  }

  async function handleCodeSubmit(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault();
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
    router.push("/profil");
    router.refresh();
  }

  if (step === "code") {
    return (
      <div className="mx-auto max-w-sm">
        <PageHeader
          title="Saisis le code"
          subtitle={`Si un compte existe pour ${email}, un code vient d'être envoyé. Vérifie tes spams.`}
        />
        <form
          onSubmit={handleCodeSubmit}
          className="rounded-xl border border-slate-200 bg-white p-6"
        >
          <label htmlFor="code" className="block text-sm font-medium">
            Code reçu par email
          </label>
          <input
            id="code"
            type="text"
            inputMode="numeric"
            autoComplete="one-time-code"
            required
            maxLength={6}
            placeholder="______"
            value={code}
            onChange={(e) => setCode(e.target.value.replace(/\D/g, ""))}
            className="mt-1 w-full rounded-lg border border-slate-300 px-3 py-2 text-center text-xl font-mono tracking-widest outline-none focus:border-brand-500 focus:ring-2 focus:ring-brand-200"
          />

          {error && <p className="mt-3 text-sm text-red-600">{error}</p>}

          <button
            type="submit"
            disabled={loading || code.length < 6}
            className="mt-4 w-full rounded-lg bg-brand-600 px-4 py-2 text-sm font-semibold text-white transition-colors hover:bg-brand-700 disabled:opacity-60"
          >
            {loading ? "Vérification..." : "Se connecter"}
          </button>

          <div className="mt-3 flex flex-col gap-1 text-center text-xs text-slate-500">
            <span>
              Pas reçu de code ?{" "}
              <button
                type="button"
                onClick={handleResend}
                disabled={loading || cooldown > 0}
                className="font-medium text-brand-600 hover:underline disabled:opacity-60"
              >
                {cooldown > 0 ? `Renvoyer (${cooldown}s)` : "Renvoyer le code"}
              </button>
            </span>
            {resent && cooldown === 0 && (
              <span className="text-green-600">Nouveau code envoyé.</span>
            )}
            <button
              type="button"
              onClick={() => {
                setStep("email");
                setCode("");
                setError(null);
                setResent(false);
              }}
              className="hover:underline"
            >
              Changer d&apos;adresse email
            </button>
          </div>
        </form>
      </div>
    );
  }

  return (
    <div className="mx-auto max-w-sm">
      <PageHeader
        title="Connexion"
        subtitle="Entre ton adresse email pour recevoir un code de connexion."
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
          className={inputClass}
        />

        {error && <p className="mt-3 text-sm text-red-600">{error}</p>}

        <button
          type="submit"
          disabled={loading}
          className="mt-4 w-full rounded-lg bg-brand-600 px-4 py-2 text-sm font-semibold text-white transition-colors hover:bg-brand-700 disabled:opacity-60"
        >
          {loading ? "Envoi..." : "Recevoir le code"}
        </button>

        <p className="mt-4 text-center text-xs text-slate-500">
          Pas encore de compte ?{" "}
          <Link href="/inscription" className="font-medium text-brand-600 hover:underline">
            S&apos;inscrire
          </Link>
        </p>
      </form>
    </div>
  );
}
