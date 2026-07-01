"use client";
import { useRouter, useSearchParams } from "next/navigation";

export function DuoPartnerSelect({
  partners,
  selectedPartnerId,
  basePath = "/profil",
}: {
  partners: { id: string; pseudo: string; rating: number }[];
  selectedPartnerId?: string;
  basePath?: string;
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
    router.replace(`${basePath}?${params.toString()}`, { scroll: false });
  }

  return (
    <div className="relative flex border-b border-slate-200">
      <select
        value={selectedPartnerId ?? ""}
        onChange={handleChange}
        className="w-full appearance-none bg-transparent py-2.5 pr-6 text-center text-sm font-semibold text-brand-600 focus:outline-none"
      >
        <option value="">Tous les duos</option>
        {partners.map((p) => (
          <option key={p.id} value={p.id}>
            Avec {p.pseudo}
          </option>
        ))}
      </select>
      <div className="pointer-events-none absolute inset-y-0 right-3 flex items-center">
        <svg
          className="size-4 text-brand-600"
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
      <span className="absolute bottom-0 left-0 right-0 h-0.5 rounded-full bg-brand-600" />
    </div>
  );
}
