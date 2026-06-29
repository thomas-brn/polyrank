"use client";
import Link from "next/link";
import { useSearchParams } from "next/navigation";

export function DuoPartnerSelector({
  partners,
  selectedPartnerId,
}: {
  partners: { id: string; pseudo: string; rating: number }[];
  selectedPartnerId?: string;
}) {
  const searchParams = useSearchParams();
  const period = searchParams.get("period");

  function buildHref(partnerId: string) {
    const params = new URLSearchParams();
    params.set("format", "2v2");
    params.set("duo", partnerId);
    if (period) params.set("period", period);
    return `/profil?${params.toString()}`;
  }

  return (
    <div className="mt-2 flex flex-wrap gap-1.5 px-0.5">
      {partners.map((p) => {
        const isSelected = p.id === selectedPartnerId;
        return (
          <Link
            key={p.id}
            href={buildHref(p.id)}
            className={`rounded-full border px-2.5 py-0.5 text-[11px] font-medium transition-colors ${
              isSelected
                ? "border-brand-600 bg-brand-600 text-white"
                : "border-slate-200 bg-white text-slate-500 hover:border-brand-400 hover:text-brand-600"
            }`}
          >
            {p.pseudo}
          </Link>
        );
      })}
    </div>
  );
}
