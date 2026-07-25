"use client";

import { useState, useSyncExternalStore } from "react";

// Instagram (et Facebook/Messenger, même moteur) empêchent l'envoi du code
// OTP : la requête /auth/v1/otp échoue en 422 dans leur WebView intégrée,
// alors qu'elle passe dans Safari/Chrome sur le même appareil (confirmé par
// les logs Supabase du 2026-07-25).
const IN_APP_BROWSER_RE = /Instagram|FBAN|FBAV|FB_IAB|Line\//i;

function subscribe() {
  return () => {};
}
// UA fixe pour toute la session : pas besoin de re-render si elle change,
// useSyncExternalStore sert ici uniquement à lire une valeur client-only
// sans mismatch d'hydratation (le serveur n'a pas de navigator.userAgent).
function getSnapshot() {
  return IN_APP_BROWSER_RE.test(navigator.userAgent);
}
function getServerSnapshot() {
  return false;
}

export function InAppBrowserBanner() {
  const isInAppBrowser = useSyncExternalStore(
    subscribe,
    getSnapshot,
    getServerSnapshot,
  );
  const [dismissed, setDismissed] = useState(false);
  const [copied, setCopied] = useState(false);

  if (!isInAppBrowser || dismissed) return null;

  async function handleCopy() {
    try {
      await navigator.clipboard.writeText(window.location.href);
      setCopied(true);
    } catch {
      setCopied(false);
    }
  }

  return (
    <div className="border-b border-amber-200 bg-amber-50 px-4 py-3 text-sm text-amber-800">
      <div className="mx-auto flex max-w-3xl items-start justify-between gap-3">
        <p>
          <strong>Le code de connexion n&apos;arrive pas ?</strong> Le
          navigateur intégré de l&apos;app (Instagram, Facebook...) bloque son
          envoi. Appuie sur <strong>⋯</strong> en haut à droite puis
          « Ouvrir dans le navigateur », ou{" "}
          <button
            type="button"
            onClick={handleCopy}
            className="font-semibold underline underline-offset-2"
          >
            {copied ? "lien copié !" : "copie ce lien"}
          </button>{" "}
          pour l&apos;ouvrir dans Safari/Chrome.
        </p>
        <button
          type="button"
          onClick={() => setDismissed(true)}
          aria-label="Fermer"
          className="shrink-0 text-amber-600 hover:text-amber-900"
        >
          ✕
        </button>
      </div>
    </div>
  );
}
