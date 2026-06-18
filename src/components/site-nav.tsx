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
  { href: "/matchs/nouveau", label: "Match", icon: PlusCircle, primary: true },
  { href: "/matchs", label: "Matchs", icon: ListOrdered },
  { href: "/profil", label: "Profil", icon: User },
];

function useIsActive() {
  const pathname = usePathname();
  return (href: string) =>
    href === "/" ? pathname === "/" : pathname === href;
}

/** Barre de navigation horizontale (desktop uniquement). */
export function TopNav() {
  const isActive = useIsActive();

  return (
    <header className="sticky top-0 z-10 hidden border-b border-slate-200 bg-white/80 backdrop-blur md:block">
      <nav className="mx-auto flex max-w-3xl items-center justify-between px-4 py-3">
        <Link href="/" className="text-lg font-bold tracking-tight">
          Poly<span className="text-blue-600">Rank</span>
        </Link>
        <ul className="flex items-center gap-1">
          {items.map(({ href, label, icon: Icon }) => (
            <li key={href}>
              <Link
                href={href}
                className={`flex items-center gap-1.5 rounded-lg px-3 py-2 text-sm font-medium transition-colors ${
                  isActive(href)
                    ? "bg-blue-50 text-blue-700"
                    : "text-slate-600 hover:bg-slate-100 hover:text-slate-900"
                }`}
              >
                <Icon className="size-4" aria-hidden />
                {label}
              </Link>
            </li>
          ))}
        </ul>
      </nav>
    </header>
  );
}

/** Barre de navigation fixe en bas (mobile uniquement). */
export function BottomNav() {
  const isActive = useIsActive();

  return (
    <nav className="fixed inset-x-0 bottom-0 z-10 border-t border-slate-200 bg-white/90 backdrop-blur md:hidden">
      <ul className="mx-auto flex max-w-3xl items-stretch justify-around">
        {items.map(({ href, label, icon: Icon, primary }) => {
          const active = isActive(href);
          return (
            <li key={href} className="flex-1">
              <Link
                href={href}
                className={`flex flex-col items-center gap-1 py-2 text-[11px] font-medium transition-colors ${
                  active ? "text-blue-700" : "text-slate-500"
                }`}
              >
                <Icon
                  className={primary ? "size-7 text-blue-600" : "size-5"}
                  aria-hidden
                />
                {label}
              </Link>
            </li>
          );
        })}
      </ul>
    </nav>
  );
}
