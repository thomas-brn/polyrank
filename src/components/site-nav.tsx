"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { useEffect, useRef, useState } from "react";
import {
  GitCompareArrows,
  House,
  ListOrdered,
  MoreHorizontal,
  PlusCircle,
  Swords,
  Trophy,
  User,
  type LucideIcon,
} from "lucide-react";

type NavItem = {
  href: string;
  label: string;
  icon: LucideIcon;
  primary?: boolean;
};

const items: NavItem[] = [
  { href: "/", label: "Accueil", icon: House },
  { href: "/classement", label: "Classement", icon: Trophy },
  { href: "/matchs/nouveau", label: "Ajouter", icon: PlusCircle, primary: true },
  { href: "/profil", label: "Profil", icon: User },
];

type MoreItem = NavItem & { description: string; soon?: boolean };

/** Entrées du menu « Autres » (dernier bouton de la nav). */
const moreItems: MoreItem[] = [
  {
    href: "/comparaison",
    label: "Comparaison",
    icon: GitCompareArrows,
    description: "Confronte les stats de deux joueurs",
  },
  {
    href: "/matchs",
    label: "Historique",
    icon: ListOrdered,
    description: "Tous les matchs joués",
  },
  {
    href: "/tournois/nouveau",
    label: "Créer un tournoi",
    icon: Swords,
    description: "Bientôt disponible",
    soon: true,
  },
];

/** Préfixes de route qui appartiennent au menu « Autres ». */
const MORE_SECTIONS = ["/comparaison", "/matchs", "/tournois"];

type NavProps = { pendingCount?: number };

function useIsActive() {
  const pathname = usePathname();
  return (href: string) =>
    href === "/" ? pathname === "/" : pathname === href;
}

/** « Autres » est actif sur toutes ses sous-sections, sauf /matchs/nouveau (= Ajouter). */
function useIsMoreActive() {
  const pathname = usePathname();
  if (pathname === "/matchs/nouveau") return false;
  return MORE_SECTIONS.some(
    (p) => pathname === p || pathname.startsWith(`${p}/`),
  );
}

/**
 * État du menu « Autres » : fermeture au clic extérieur, à Échap et au
 * changement de route. Le bouton bascule lui-même est exclu du « clic
 * extérieur » (sinon un second appui rouvrirait le menu aussitôt fermé).
 */
function useMoreMenu() {
  const pathname = usePathname();
  // On mémorise la route sur laquelle le menu a été ouvert : dès qu'elle
  // change, le menu se referme sans effet ni setState supplémentaire.
  const [openedAt, setOpenedAt] = useState<string | null>(null);
  const open = openedAt === pathname;
  const panelRef = useRef<HTMLDivElement>(null);
  const buttonRef = useRef<HTMLButtonElement>(null);

  const close = () => setOpenedAt(null);
  const toggle = () => setOpenedAt(open ? null : pathname);

  useEffect(() => {
    if (!open) return;
    function onPointerDown(event: MouseEvent) {
      const target = event.target as Node;
      if (panelRef.current?.contains(target)) return;
      if (buttonRef.current?.contains(target)) return;
      setOpenedAt(null);
    }
    function onKeyDown(event: KeyboardEvent) {
      if (event.key === "Escape") setOpenedAt(null);
    }
    document.addEventListener("mousedown", onPointerDown);
    document.addEventListener("keydown", onKeyDown);
    return () => {
      document.removeEventListener("mousedown", onPointerDown);
      document.removeEventListener("keydown", onKeyDown);
    };
  }, [open]);

  return { open, toggle, close, panelRef, buttonRef };
}

function Badge({ count }: { count: number }) {
  return (
    <span className="absolute -top-1.5 -right-1.5 flex h-4.5 min-w-4.5 items-center justify-center rounded-full bg-red-500 px-1 text-[10px] font-bold leading-none text-white">
      {count > 9 ? "9+" : count}
    </span>
  );
}

/** Liste des liens du menu « Autres », partagée par les deux navs. */
function MoreMenuItems({ onNavigate }: { onNavigate: () => void }) {
  const pathname = usePathname();

  return (
    <ul className="flex flex-col">
      {moreItems.map(({ href, label, icon: Icon, description, soon }) => {
        const active = pathname === href || pathname.startsWith(`${href}/`);
        return (
          <li key={href}>
            <Link
              href={href}
              onClick={onNavigate}
              className={`flex items-center gap-3 px-4 py-3 transition-colors ${
                active ? "bg-brand-50" : "hover:bg-slate-50"
              }`}
            >
              <span
                className={`flex size-9 shrink-0 items-center justify-center rounded-xl ${
                  active
                    ? "bg-brand-600 text-white"
                    : "bg-slate-100 text-slate-500"
                }`}
              >
                <Icon className="size-5" aria-hidden />
              </span>
              <span className="min-w-0">
                <span className="flex items-center gap-1.5 text-sm font-medium text-slate-900">
                  {label}
                  {soon ? (
                    <span className="rounded-full bg-slate-100 px-1.5 py-0.5 text-[10px] font-semibold uppercase tracking-wide text-slate-500">
                      Bientôt
                    </span>
                  ) : null}
                </span>
                <span className="mt-0.5 block truncate text-xs text-slate-500">
                  {description}
                </span>
              </span>
            </Link>
          </li>
        );
      })}
    </ul>
  );
}

/** Boutons carrés flottants, centrés verticalement — case qui grandit au survol (desktop). */
export function SideNav({ pendingCount = 0 }: NavProps) {
  const isActive = useIsActive();
  const moreActive = useIsMoreActive();
  const { open, toggle, close, panelRef, buttonRef } = useMoreMenu();

  const buttonClass = (active: boolean) =>
    `relative flex h-14 w-14 items-center justify-center rounded-2xl transition-all duration-200 active:scale-95 group-hover:scale-105 group-hover/btn:!scale-[1.15] ${
      active
        ? "bg-brand-600 text-white shadow-lg shadow-brand-200"
        : "bg-slate-100 text-slate-400 shadow-sm hover:bg-slate-200 hover:text-slate-700"
    }`;

  return (
    <aside className="group fixed left-8 top-1/2 z-10 hidden -translate-y-1/2 flex-col gap-5 md:flex">
      {items.map(({ href, label, icon: Icon }) => {
        const active = isActive(href);
        const showBadge = href === "/profil" && pendingCount > 0;
        return (
          <div key={href} className="group/btn relative">
            <Link href={href} className={buttonClass(active)}>
              <Icon className="size-6" aria-hidden />
              {showBadge ? <Badge count={pendingCount} /> : null}
            </Link>

            {/* Badge label à droite — slide-in au survol */}
            <span className="pointer-events-none absolute top-1/2 left-full ml-4 -translate-x-2 -translate-y-1/2 whitespace-nowrap rounded-2xl bg-slate-100 px-4 py-2.5 text-[11px] font-bold uppercase tracking-widest text-slate-700 opacity-0 shadow-sm transition-all duration-200 group-hover/btn:translate-x-0 group-hover/btn:opacity-100">
              {label}
            </span>
          </div>
        );
      })}

      {/* Menu « Autres » */}
      <div className="group/btn relative">
        <button
          ref={buttonRef}
          type="button"
          onClick={toggle}
          aria-label="Autres"
          aria-expanded={open}
          aria-haspopup="menu"
          className={`${buttonClass(moreActive || open)} cursor-pointer`}
        >
          <MoreHorizontal className="size-6" aria-hidden />
        </button>

        {open ? (
          <div
            ref={panelRef}
            className="absolute bottom-0 left-full ml-4 w-72 overflow-hidden rounded-2xl border border-slate-200 bg-white py-1 shadow-xl"
          >
            <MoreMenuItems onNavigate={close} />
          </div>
        ) : (
          <span className="pointer-events-none absolute top-1/2 left-full ml-4 -translate-x-2 -translate-y-1/2 whitespace-nowrap rounded-2xl bg-slate-100 px-4 py-2.5 text-[11px] font-bold uppercase tracking-widest text-slate-700 opacity-0 shadow-sm transition-all duration-200 group-hover/btn:translate-x-0 group-hover/btn:opacity-100">
            Autres
          </span>
        )}
      </div>
    </aside>
  );
}

/** Barre de navigation fixe en bas (mobile uniquement). */
export function BottomNav({ pendingCount = 0 }: NavProps) {
  const isActive = useIsActive();
  const moreActive = useIsMoreActive();
  const { open, toggle, close, panelRef, buttonRef } = useMoreMenu();

  return (
    <>
      {open ? (
        <div
          className="fixed inset-0 z-10 bg-slate-900/20 md:hidden"
          aria-hidden
        />
      ) : null}

      <nav className="fixed inset-x-0 bottom-0 z-10 border-t border-slate-200 bg-white/90 backdrop-blur md:hidden">
        {open ? (
          <div
            ref={panelRef}
            className="absolute inset-x-3 bottom-full mb-2 overflow-hidden rounded-2xl border border-slate-200 bg-white py-1 shadow-xl"
          >
            <MoreMenuItems onNavigate={close} />
          </div>
        ) : null}

        <ul className="mx-auto flex max-w-3xl items-stretch justify-around">
          {items.map(({ href, label, icon: Icon, primary }) => {
            const active = isActive(href);
            const showBadge = href === "/profil" && pendingCount > 0;
            return (
              <li key={href} className="flex-1">
                <Link
                  href={href}
                  className={`relative flex flex-col items-center gap-1 py-2 text-center text-[11px] font-medium transition-colors ${
                    active ? "text-brand-700" : "text-slate-500"
                  }`}
                >
                  <span className="relative">
                    <Icon
                      className={primary ? "size-7 text-brand-600" : "size-5"}
                      aria-hidden
                    />
                    {showBadge ? <Badge count={pendingCount} /> : null}
                  </span>
                  {label}
                </Link>
              </li>
            );
          })}

          <li className="flex-1">
            <button
              ref={buttonRef}
              type="button"
              onClick={toggle}
              aria-expanded={open}
              aria-haspopup="menu"
              className={`flex w-full cursor-pointer flex-col items-center gap-1 py-2 text-center text-[11px] font-medium transition-colors ${
                moreActive || open ? "text-brand-700" : "text-slate-500"
              }`}
            >
              <MoreHorizontal className="size-5" aria-hidden />
              Autres
            </button>
          </li>
        </ul>
      </nav>
    </>
  );
}
