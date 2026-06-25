import { cookies } from "next/headers";

/**
 * « Mode » de l'app = le sport actif. Chaque mode pilote à la fois le thème
 * (couleur de marque) et le jeu sur lequel les données sont filtrées.
 * La valeur du mode correspond au `slug` du jeu en base.
 */
export type Mode = "fifachamp" | "coincoin";

export const MODE_COOKIE = "polyrank-mode";
export const DEFAULT_MODE: Mode = "fifachamp";

export const MODES: Record<
  Mode,
  { slug: Mode; sport: string; icon: "gamepad" | "beer" }
> = {
  fifachamp: { slug: "fifachamp", sport: "FifaChamp", icon: "gamepad" },
  coincoin: { slug: "coincoin", sport: "CoinCoin", icon: "beer" },
};

export function isMode(value: string | undefined): value is Mode {
  return value === "fifachamp" || value === "coincoin";
}

/** Mode courant lu depuis le cookie (server-only). */
export async function getMode(): Promise<Mode> {
  const store = await cookies();
  const value = store.get(MODE_COOKIE)?.value;
  return isMode(value) ? value : DEFAULT_MODE;
}
