"use client";

import { useActionState, useState } from "react";
import { useRouter } from "next/navigation";

import { useCooldown } from "@/lib/use-cooldown";

import { PseudoField } from "@/components/pseudo-field";
import { ANNEES, EXTE_SLUG } from "@/lib/constants";
import { createClient } from "@/lib/supabase/client";
import { completeProfile, type OnboardingState } from "./actions";

type School = { id: string; name: string; slug: string };
type Step = "profil" | "email" | "code";

const inputClass =
  "mt-1 w-full rounded-lg border border-slate-300 px-3 py-2 text-sm outline-none focus:border-brand-500 focus:ring-2 focus:ring-brand-200";

function SchoolSelect({
  schools,
  value,
  onChange,
}: {
  schools: School[];
  value: string;
  onChange: (v: string) => void;
}) {
  return (
    <div>
      <label htmlFor="ecole" className="block text-sm font-medium">
        École
      </label>
      <select
        id="ecole"
        name="ecole"
        required
        value={value}
        onChange={(e) => onChange(e.target.value)}
        className={inputClass}
      >
        <option value="" disabled>
          Choisis ton école…
        </option>
        {schools.filter((s) => s.slug !== EXTE_SLUG).map((school) => (
          <option key={school.id} value={school.id}>
            {school.name}
          </option>
        ))}
        <option value="" disabled>
          T'es même le bienvenu si t'es pas du réseau
        </option>
        {schools.filter((s) => s.slug === EXTE_SLUG).map((school) => (
          <option key={school.id} value={school.id}>
            {school.name}
          </option>
        ))}
      </select>
    </div>
  );
}

function AnneeSelect() {
  return (
    <div>
      <label htmlFor="annee" className="block text-sm font-medium">
        Année
      </label>
      <select
        id="annee"
        name="annee"
        required
        defaultValue=""
        className={inputClass}
      >
        <option value="" disabled>
          Choisis ton année…
        </option>
        {ANNEES.map((a) => (
          <option key={a.value} value={a.value}>
            {a.label}
          </option>
        ))}
      </select>
    </div>
  );
}

// Formulaire pour les utilisateurs déjà connectés (complétion de profil).
function AuthenticatedForm({
  schools,
  selfId,
}: {
  schools: School[];
  selfId: string;
}) {
  const [ecole, setEcole] = useState("");
  const [state, formAction, pending] = useActionState<OnboardingState, FormData>(
    completeProfile,
    {},
  );

  const selectedSchool = schools.find((s) => s.id === ecole);
  const showAnnee = ecole !== "" && selectedSchool?.slug !== EXTE_SLUG;

  return (
    <form
      action={formAction}
      className="flex flex-col gap-5 rounded-xl border border-slate-200 bg-white p-6"
    >
      <div>
        <PseudoField selfId={selfId} />
        <p className="mt-1 text-xs text-amber-600">
          Ton pseudo est <strong>public</strong>, évite ton nom et prénom. Tu
          pourras en changer une fois par mois.
        </p>
      </div>

      <SchoolSelect schools={schools} value={ecole} onChange={setEcole} />

      {showAnnee && <AnneeSelect />}

      {state.error && <p className="text-sm text-red-600">{state.error}</p>}

      <button
        type="submit"
        disabled={pending}
        className="rounded-lg bg-brand-600 px-4 py-2 text-sm font-semibold text-white transition-colors hover:bg-brand-700 disabled:opacity-60"
      >
        {pending ? "Enregistrement…" : "Créer mon profil"}
      </button>
    </form>
  );
}

// Formulaire multi-étapes pour les nouveaux utilisateurs (non connectés).
function UnauthenticatedForm({ schools }: { schools: School[] }) {
  const router = useRouter();
  const [step, setStep] = useState<Step>("profil");
  const [ecole, setEcole] = useState("");
  const [profileData, setProfileData] = useState<{
    pseudo: string;
    ecole: string;
    annee: string;
  } | null>(null);
  const [email, setEmail] = useState("");
  const [code, setCode] = useState("");
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [resent, setResent] = useState(false);
  const [cooldown, startCooldown] = useCooldown(30);

  function handleProfilSubmit(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault();
    const fd = new FormData(e.currentTarget);
    setProfileData({
      pseudo: String(fd.get("pseudo") ?? "").trim(),
      ecole: String(fd.get("ecole") ?? ""),
      annee: String(fd.get("annee") ?? ""),
    });
    setStep("email");
  }

  async function handleEmailSubmit(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault();
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
      options: { shouldCreateUser: true },
    });
    setLoading(false);
    if (otpError) {
      setError(otpError.message);
      return;
    }
    startCooldown();
    setResent(true);
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
    if (verifyError) {
      setLoading(false);
      setError("Code invalide ou expiré. Réessaie.");
      return;
    }
    const {
      data: { user },
    } = await supabase.auth.getUser();
    if (!user || !profileData) {
      setLoading(false);
      setError("Erreur inattendue. Réessaie.");
      return;
    }

    // L'email appartenait déjà à un compte complété : on connecte le
    // propriétaire sans écraser son profil existant.
    const { data: own } = await supabase
      .from("profiles")
      .select("pseudo")
      .eq("id", user.id)
      .single<{ pseudo: string | null }>();
    if (own?.pseudo) {
      router.push("/profil");
      router.refresh();
      return;
    }

    const selectedSchool = schools.find((s) => s.id === profileData.ecole);
    const isExte = selectedSchool?.slug === EXTE_SLUG;
    const { error: updateError } = await supabase
      .from("profiles")
      .update({
        pseudo: profileData.pseudo,
        school_id: profileData.ecole,
        annee: isExte ? null : profileData.annee || null,
      })
      .eq("id", user.id);
    if (updateError) {
      setLoading(false);
      setError(
        updateError.code === "23505"
          ? "Ce pseudo est déjà pris. Retourne à l'étape précédente."
          : updateError.message,
      );
      return;
    }
    router.push("/profil");
    router.refresh();
  }

  if (step === "email") {
    return (
      <form
        onSubmit={handleEmailSubmit}
        className="flex flex-col gap-5 rounded-xl border border-slate-200 bg-white p-6"
      >
        <div>
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
        </div>

        {error && <p className="text-sm text-red-600">{error}</p>}

        <button
          type="submit"
          disabled={loading}
          className="rounded-lg bg-brand-600 px-4 py-2 text-sm font-semibold text-white transition-colors hover:bg-brand-700 disabled:opacity-60"
        >
          {loading ? "Envoi…" : "Recevoir le code"}
        </button>
        <button
          type="button"
          onClick={() => {
            setStep("profil");
            setError(null);
          }}
          className="text-center text-xs text-slate-500 hover:underline"
        >
          Retour
        </button>
      </form>
    );
  }

  if (step === "code") {
    return (
      <form
        onSubmit={handleCodeSubmit}
        className="flex flex-col gap-5 rounded-xl border border-slate-200 bg-white p-6"
      >
        <p className="text-sm text-slate-600">
          Code envoyé à <strong>{email}</strong>. Vérifie tes spams.
        </p>
        <div>
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
        </div>

        {error && <p className="text-sm text-red-600">{error}</p>}

        <button
          type="submit"
          disabled={loading || code.length < 6}
          className="rounded-lg bg-brand-600 px-4 py-2 text-sm font-semibold text-white transition-colors hover:bg-brand-700 disabled:opacity-60"
        >
          {loading ? "Validation…" : "Valider et créer mon compte"}
        </button>

        <div className="flex flex-col gap-1 text-center text-xs text-slate-500">
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
    );
  }

  // Étape "profil"
  return (
    <form
      onSubmit={handleProfilSubmit}
      className="flex flex-col gap-5 rounded-xl border border-slate-200 bg-white p-6"
    >
      <div>
        <PseudoField selfId={null} />
        <p className="mt-1 text-xs text-amber-600">
          Ton pseudo est <strong>public</strong>, évite ton nom et prénom. <br />
          Tu pourras le modifier une fois par mois.
        </p>
      </div>

      <SchoolSelect schools={schools} value={ecole} onChange={setEcole} />

      {ecole !== "" && schools.find((s) => s.id === ecole)?.slug !== EXTE_SLUG && <AnneeSelect />}

      <button
        type="submit"
        className="rounded-lg bg-brand-600 px-4 py-2 text-sm font-semibold text-white transition-colors hover:bg-brand-700"
      >
        Continuer
      </button>
    </form>
  );
}

export function OnboardingForm({
  schools,
  selfId,
  isAuthenticated,
}: {
  schools: School[];
  selfId: string | null;
  isAuthenticated: boolean;
}) {
  if (isAuthenticated && selfId) {
    return <AuthenticatedForm schools={schools} selfId={selfId} />;
  }
  return <UnauthenticatedForm schools={schools} />;
}
