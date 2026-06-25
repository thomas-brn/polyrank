import { getMode } from "@/lib/mode";
import { ModeToggle } from "@/components/mode-toggle";

/**
 * Bandeau d'en-tête de page : titre + courte description à gauche, et à droite
 * la bascule bière/manette (sport + thème). Reprend le style du hero d'accueil.
 */
export async function PageHero({
  title,
  description,
  children,
  topRightAction,
  pendingCounts,
}: {
  title: string;
  description?: string;
  children?: React.ReactNode;
  topRightAction?: React.ReactNode;
  pendingCounts?: Partial<Record<string, number>>;
}) {
  const mode = await getMode();

  return (
    <section className="relative flex flex-col gap-4 rounded-2xl bg-gradient-to-br from-brand-600 to-brand-accent p-6 pb-3 text-white md:flex-row md:items-center md:justify-between md:gap-6 md:pb-6">
      {topRightAction && (
        <div className="absolute right-4 top-4 md:hidden">
          {topRightAction}
        </div>
      )}
      <div className="min-w-0">
        <h1 className="text-2xl font-bold tracking-tight">{title}</h1>
        {description ? (
          <p className="mt-1 max-w-md text-sm text-brand-50">{description}</p>
        ) : null}
        {children ? <div className="mt-4">{children}</div> : null}
      </div>
      <ModeToggle current={mode} pendingCounts={pendingCounts} />
    </section>
  );
}
