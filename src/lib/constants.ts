// Constantes métier partagées (onboarding, profil, affichage).

export const ANNEES = [
  { value: "PEIP1", label: "Peip1" },
  { value: "PEIP2", label: "Peip2" },
  { value: "3A", label: "3A" },
  { value: "4A", label: "4A" },
  { value: "5A", label: "5A" },
  { value: "VIEUX_CON", label: "Vieux con" },
] as const;

export const ANNEE_VALUES = ANNEES.map((a) => a.value) as string[];

export const ANNEE_LABELS: Record<string, string> = Object.fromEntries(
  ANNEES.map((a) => [a.value, a.label]),
);

/** Valeur du select « école » pour un joueur extérieur au réseau Polytech. */
export const EXTERNAL_VALUE = "EXTE";

export const ALCOHOL_NOTICE =
  "L'abus d'alcool est dangereux pour la santé, à consommer avec modération.";
