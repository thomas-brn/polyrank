"use client";
import { useRouter, useSearchParams } from "next/navigation";

export function DuoPartnerSelect({
  partners,
  selectedPartnerId,
}: {
  partners: { id: string; pseudo: string; rating: number }[];
  selectedPartnerId?: string;
}) {
  const router = useRouter();
  const searchParams = useSearchParams();
  const period = searchParams.get("period");

  function handleChange(e: React.ChangeEvent<HTMLSelectElement>) {
    const value = e.target.value;
    const params = new URLSearchParams();
    params.set("format", "2v2");
    if (value) params.set("duo", value);
    if (period) params.set("period", period);
    router.replace(`/profil?${params.toString()}`, { scroll: false });
  }

  return (
    <div className="relative mt-3">
      <select
        value={selectedPartnerId ?? ""}
        onChange={handleChange}
        className="w-full appearance-none rounded-xl border border-slate-200 bg-white px-3.5 py-2.5 pr-9 text-sm text-slate-700 focus:border-brand-500 focus:outline-none focus:ring-2 focus:ring-brand-500/20"
      >
        <option value="">Général (tous mes 2v2)</option>
        {partners.map((p) => (
          <option key={p.id} value={p.id}>
            Avec {p.pseudo}
          </option>
        ))}
      </select>
      <div className="pointer-events-none absolute inset-y-0 right-3 flex items-center">
        <svg
          className="size-4 text-slate-400"
          xmlns="http://www.w3.org/2000/svg"
          viewBox="0 0 20 20"
          fill="currentColor"
          aria-hidden="true"
        >
          <path
            fillRule="evenodd"
            d="M5.22 8.22a.75.75 0 0 1 1.06 0L10 11.94l3.72-3.72a.75.75 0 1 1 1.06 1.06l-4.25 4.25a.75.75 0 0 1-1.06 0L5.22 9.28a.75.75 0 0 1 0-1.06Z"
            clipRule="evenodd"
          />
        </svg>
      </div>
    </div>
  );
}
