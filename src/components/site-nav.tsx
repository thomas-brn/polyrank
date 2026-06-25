"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import {
  House,
  ListOrdered,
  PlusCircle,
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
  { href: "/matchs", label: "Historique", icon: ListOrdered },
  { href: "/profil", label: "Profil", icon: User },
];

type NavProps = { pendingCount?: number };

function useIsActive() {
  const pathname = usePathname();
  return (href: string) =>
    href === "/" ? pathname === "/" : pathname === href;
}

function Badge({ count }: { count: number }) {
  return (
    <span className="absolute -top-1.5 -right-1.5 flex h-4.5 min-w-4.5 items-center justify-center rounded-full bg-red-500 px-1 text-[10px] font-bold leading-none text-white">
      {count > 9 ? "9+" : count}
    </span>
  );
}

/** Boutons carrés flottants, centrés verticalement — case qui grandit au survol (desktop). */
export function SideNav({ pendingCount = 0 }: NavProps) {
  const isActive = useIsActive();

  return (
    <aside className="group fixed left-8 top-1/2 z-10 hidden -translate-y-1/2 flex-col gap-5 md:flex">
      {items.map(({ href, label, icon: Icon }) => {
        const active = isActive(href);
        const showBadge = href === "/profil" && pendingCount > 0;
        return (
          <div key={href} className="group/btn relative">
            <Link
              href={href}
              className={`relative flex h-14 w-14 items-center justify-center rounded-2xl transition-all duration-200 active:scale-95 group-hover:scale-105 group-hover/btn:!scale-[1.15] ${
                active
                  ? "bg-brand-50 text-brand-600 shadow-md shadow-slate-200"
                  : "bg-slate-100 text-slate-600 shadow-sm hover:bg-slate-200 hover:text-slate-900"
              }`}
            >
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
    </aside>
  );
}

/** Barre de navigation fixe en bas (mobile uniquement). */
export function BottomNav({ pendingCount = 0 }: NavProps) {
  const isActive = useIsActive();

  return (
    <nav className="fixed inset-x-0 bottom-0 z-10 border-t border-slate-200 bg-white/90 backdrop-blur md:hidden">
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
      </ul>
    </nav>
  );
}
