"use client";

import { useActionState, useState } from "react";
import { useRouter } from "next/navigation";

import { useCooldown } from "@/lib/use-cooldown";

import { PseudoField } from "@/components/pseudo-field";
import { ANNEE_VALUES, ANNEES, EXTE_SLUG } from "@/lib/constants";
import { createClient } from "@/lib/supabase/client";
import { completeProfile, type OnboardingState } from "./actions";

type School = { id: string; name: string; slug: string };
type LegacyPlayer = {
  id: string;
  pseudo: string;
  ville: string | null;
  isExte: boolean;
};
type Step = "profil" | "email" | "code";
type Mode = "choose" | "new" | "claim";
const PSEUDO_RE = /^[a-zA-Z0-9À-ɏ_-]+$/;

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
          Choisis ton école...
        </option>
        {schools.filter((s) => s.slug !== EXTE_SLUG).map((school) => (
          <option key={school.id} value={school.id}>
            {school.name}
          </option>
        ))}
        <option value="" disabled>
          T&apos;es même le bienvenu si t&apos;es pas du réseau
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
          Choisis ton année...
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
          Ton pseudo est <strong>public</strong>, évite ton nom et ton prénom. Tu
          pourras le modifier une fois par mois.
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
        {pending ? "Enregistrement..." : "Créer mon profil"}
      </button>
    </form>
  );
}

// Étape de code OTP réutilisée par l'inscription et la réclamation legacy.
function CodeStep({
  email,
  code,
  setCode,
  loading,
  error,
  submitLabel,
  onSubmit,
  onResend,
  onChangeEmail,
  cooldown,
  resent,
}: {
  email: string;
  code: string;
  setCode: (v: string) => void;
  loading: boolean;
  error: string | null;
  submitLabel: string;
  onSubmit: (e: React.FormEvent<HTMLFormElement>) => void;
  onResend: () => void;
  onChangeEmail: () => void;
  cooldown: number;
  resent: boolean;
}) {
  return (
    <form
      onSubmit={onSubmit}
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
        {loading ? "Validation..." : submitLabel}
      </button>

      <div className="flex flex-col gap-1 text-center text-xs text-slate-500">
        <span>
          Pas reçu de code ?{" "}
          <button
            type="button"
            onClick={onResend}
            disabled={loading || cooldown > 0}
            className="font-medium text-brand-600 hover:underline disabled:opacity-60"
          >
            {cooldown > 0 ? `Renvoyer (${cooldown}s)` : "Renvoyer le code"}
          </button>
        </span>
        {resent && cooldown === 0 && (
          <span className="text-green-600">Nouveau code envoyé.</span>
        )}
        <button type="button" onClick={onChangeEmail} className="hover:underline">
          Changer d&apos;adresse email
        </button>
      </div>
    </form>
  );
}

// Flux de réclamation d'un ancien joueur du Google Sheet Champish.
function ClaimFlow({
  legacyPlayers,
  onBack,
}: {
  legacyPlayers: LegacyPlayer[];
  onBack: () => void;
}) {
  const router = useRouter();
  const [step, setStep] = useState<"list" | "details" | "email" | "code">(
    "list",
  );
  const [query, setQuery] = useState("");
  const [notFound, setNotFound] = useState(false);
  const [selected, setSelected] = useState<LegacyPlayer | null>(null);
  const [pseudoOverride, setPseudoOverride] = useState("");
  const [annee, setAnnee] = useState("");
  const [email, setEmail] = useState("");
  const [code, setCode] = useState("");
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [resent, setResent] = useState(false);
  const [cooldown, startCooldown] = useCooldown(30);

  const filtered = query.trim()
    ? legacyPlayers.filter((p) =>
        p.pseudo.toLowerCase().includes(query.trim().toLowerCase()),
      )
    : legacyPlayers;

  // Le sheet Champish n'imposait pas de limite de pseudo et ne renseignait
  // jamais l'année : on les redemande donc à la réclamation si besoin.
  const pseudoTooLong = (selected?.pseudo.trim().length ?? 0) > 15;
  const needsAnnee = selected != null && !selected.isExte;

  async function sendCode() {
    setError(null);
    setResent(false);
    const supabase = createClient();
    const { error: otpError } = await supabase.auth.signInWithOtp({
      email,
      options: { shouldCreateUser: true },
    });
    if (otpError) {
      setError(otpError.message);
      return false;
    }
    startCooldown();
    return true;
  }

  async function handleEmailSubmit(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault();
    setLoading(true);
    const ok = await sendCode();
    setLoading(false);
    if (ok) setStep("code");
  }

  async function handleResend() {
    setLoading(true);
    const ok = await sendCode();
    setLoading(false);
    if (ok) setResent(true);
  }

  async function handleCodeSubmit(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault();
    if (!selected) return;
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
    if (!user) {
      setLoading(false);
      setError("Erreur inattendue. Réessaie.");
      return;
    }

    // Si l'email correspond déjà à un compte finalisé, on ne réclame pas.
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

    const { error: claimError } = await supabase.rpc("claim_legacy_profile", {
      p_legacy_id: selected.id,
      p_pseudo: pseudoOverride || null,
      p_annee: annee || null,
    });
    if (claimError) {
      setLoading(false);
      // Le message exact du RPC (ou de PostgREST) est affiché : "déjà réclamé"
      // ne doit s'afficher que si c'est vraiment ce que la base a répondu,
      // pas comme fourre-tout pour n'importe quelle erreur (ex. RPC introuvable
      // après une migration non déployée), sinon le vrai problème est invisible.
      console.error("claim_legacy_profile error:", claimError);
      const msg = claimError.message ?? "";
      setError(
        claimError.code === "23505"
          ? "Ce pseudo est déjà pris. Retourne à l'étape précédente."
          : msg
            ? `${msg} Si le souci persiste, contacte @bdbleu sur Insta.`
            : "Erreur inattendue. Si le souci persiste, contacte @bdbleu sur Insta.",
      );
      return;
    }
    router.push("/profil");
    router.refresh();
  }

  function handleDetailsSubmit(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault();
    const fd = new FormData(e.currentTarget);
    if (pseudoTooLong) {
      const p = String(fd.get("pseudo") ?? "").trim();
      if (p.length < 2 || p.length > 15 || !PSEUDO_RE.test(p)) {
        setError("Choisis un pseudo valide (2 à 15 caractères).");
        return;
      }
      setPseudoOverride(p);
    }
    if (needsAnnee) {
      const a = String(fd.get("annee") ?? "");
      if (!ANNEE_VALUES.includes(a)) {
        setError("Choisis ton année.");
        return;
      }
      setAnnee(a);
    }
    setError(null);
    setStep("email");
  }

  if (step === "code") {
    return (
      <CodeStep
        email={email}
        code={code}
        setCode={setCode}
        loading={loading}
        error={error}
        submitLabel="Récupérer mon historique"
        onSubmit={handleCodeSubmit}
        onResend={handleResend}
        onChangeEmail={() => {
          setStep("email");
          setCode("");
          setError(null);
          setResent(false);
        }}
        cooldown={cooldown}
        resent={resent}
      />
    );
  }

  if (step === "details") {
    return (
      <form
        onSubmit={handleDetailsSubmit}
        className="flex flex-col gap-5 rounded-xl border border-slate-200 bg-white p-6"
      >
        <p className="text-sm text-slate-600">
          Encore un détail avant de lier <strong>{selected?.pseudo}</strong> à
          ton compte.
        </p>

        {pseudoTooLong && (
          <div>
            <PseudoField selfId={null} />
            <p className="mt-1 text-xs text-amber-600">
              Ton ancien pseudo faisait plus de 15 caractères, choisis-en un
              nouveau.
            </p>
          </div>
        )}

        {needsAnnee && <AnneeSelect />}

        {error && <p className="text-sm text-red-600">{error}</p>}

        <button
          type="submit"
          className="rounded-lg bg-brand-600 px-4 py-2 text-sm font-semibold text-white transition-colors hover:bg-brand-700"
        >
          Continuer
        </button>
        <button
          type="button"
          onClick={() => {
            setStep("list");
            setError(null);
          }}
          className="text-center text-xs text-slate-500 hover:underline"
        >
          Retour
        </button>
      </form>
    );
  }

  if (step === "email") {
    return (
      <form
        onSubmit={handleEmailSubmit}
        className="flex flex-col gap-5 rounded-xl border border-slate-200 bg-white p-6"
      >
        <p className="text-sm text-slate-600">
          Tu récupères le profil <strong>{selected?.pseudo}</strong>. Ajoute ton
          email pour le vérifier et le lier à ton compte.
        </p>
        <div>
          <label htmlFor="claim-email" className="block text-sm font-medium">
            Adresse email
          </label>
          <input
            id="claim-email"
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
          {loading ? "Envoi..." : "Recevoir le code"}
        </button>
        <button
          type="button"
          onClick={() => {
            setStep("list");
            setError(null);
          }}
          className="text-center text-xs text-slate-500 hover:underline"
        >
          Retour
        </button>
      </form>
    );
  }

  // Étape "list" : choisir son ancien pseudo.
  return (
    <div className="flex flex-col gap-4 rounded-xl border border-slate-200 bg-white p-6">
      <p className="text-sm text-slate-600">
        Retrouve le pseudo que tu utilisais sur le Google Sheet{" "}
        <strong>Classement ELO Champish</strong> et clique dessus.
      </p>

      <input
        type="text"
        placeholder="Rechercher un pseudo..."
        value={query}
        onChange={(e) => setQuery(e.target.value)}
        className={inputClass}
      />

      <div className="max-h-72 overflow-y-auto rounded-lg border border-slate-200">
        {filtered.length === 0 ? (
          <p className="px-3 py-4 text-center text-sm text-slate-500">
            Aucun pseudo ne correspond.
          </p>
        ) : (
          <ul className="divide-y divide-slate-100">
            {filtered.map((p) => (
              <li key={p.id}>
                <button
                  type="button"
                  onClick={() => {
                    setSelected(p);
                    setPseudoOverride("");
                    setAnnee("");
                    setStep(
                      p.pseudo.trim().length > 15 || !p.isExte
                        ? "details"
                        : "email",
                    );
                  }}
                  className="flex w-full items-center justify-between px-3 py-2.5 text-left text-sm hover:bg-slate-50"
                >
                  <span className="font-medium">{p.pseudo}</span>
                  {p.ville && (
                    <span className="text-xs text-slate-500">{p.ville}</span>
                  )}
                </button>
              </li>
            ))}
          </ul>
        )}
      </div>

      {notFound ? (
        <p className="rounded-lg bg-amber-50 px-3 py-2 text-sm text-amber-700">
          Envoie un message sur insta à{" "}
          <a
            href="https://instagram.com/bdbleu"
            target="_blank"
            rel="noopener noreferrer"
            className="font-semibold underline"
          >
            @bdbleu
          </a>{" "}
          pour régler ce souci.
        </p>
      ) : (
        <button
          type="button"
          onClick={() => setNotFound(true)}
          className="text-center text-xs font-medium text-brand-600 hover:underline"
        >
          Je ne trouve pas mon nom
        </button>
      )}

      <button
        type="button"
        onClick={onBack}
        className="text-center text-xs text-slate-500 hover:underline"
      >
        Retour
      </button>
    </div>
  );
}

// Formulaire multi-étapes pour les nouveaux utilisateurs (non connectés).
function UnauthenticatedForm({
  schools,
  legacyPlayers,
}: {
  schools: School[];
  legacyPlayers: LegacyPlayer[];
}) {
  const router = useRouter();
  const [mode, setMode] = useState<Mode>("choose");
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

  if (mode === "choose") {
    return (
      <div className="flex flex-col gap-3 rounded-xl border border-slate-200 bg-white p-6">
        <p className="text-sm text-slate-600">
          Avais-tu déjà un historique sur le Google Sheet{" "}
          <strong>Classement ELO Champish</strong> ?
        </p>
        <button
          type="button"
          onClick={() => setMode("claim")}
          className="rounded-lg border border-brand-600 px-4 py-3 text-left text-sm font-semibold text-brand-700 transition-colors hover:bg-brand-50"
        >
          Oui, je récupère mon historique
          <span className="mt-0.5 block text-xs font-normal text-slate-500">
            Retrouve ton ancien pseudo et lie-le à ton email.
          </span>
        </button>
        <button
          type="button"
          onClick={() => setMode("new")}
          className="rounded-lg border border-slate-300 px-4 py-3 text-left text-sm font-semibold text-slate-700 transition-colors hover:bg-slate-50"
        >
          Non, je crée un nouveau compte
          <span className="mt-0.5 block text-xs font-normal text-slate-500">
            Première fois sur PolyRank.
          </span>
        </button>
      </div>
    );
  }

  if (mode === "claim") {
    return (
      <ClaimFlow
        legacyPlayers={legacyPlayers}
        onBack={() => setMode("choose")}
      />
    );
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
          {loading ? "Envoi..." : "Recevoir le code"}
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
          {loading ? "Validation..." : "Valider et créer mon compte"}
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
          Ton pseudo est <strong>public</strong>, évite ton nom et ton prénom. <br />
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
      <button
        type="button"
        onClick={() => setMode("choose")}
        className="text-center text-xs text-slate-500 hover:underline"
      >
        Retour
      </button>
    </form>
  );
}

export function OnboardingForm({
  schools,
  selfId,
  isAuthenticated,
  legacyPlayers,
}: {
  schools: School[];
  selfId: string | null;
  isAuthenticated: boolean;
  legacyPlayers: LegacyPlayer[];
}) {
  if (isAuthenticated && selfId) {
    return <AuthenticatedForm schools={schools} selfId={selfId} />;
  }
  return <UnauthenticatedForm schools={schools} legacyPlayers={legacyPlayers} />;
}
