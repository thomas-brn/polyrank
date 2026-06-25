"use client";

import { Trash2 } from "lucide-react";

export function DeleteButton() {
  return (
    <button
      type="submit"
      onClick={(e) => {
        if (!confirm("Supprimer ce match ? Cette action est irréversible.")) {
          e.preventDefault();
        }
      }}
      className="inline-flex items-center gap-1.5 rounded-lg border border-red-200 px-4 py-2 text-sm font-medium text-red-600 transition-colors hover:bg-red-50"
    >
      <Trash2 className="size-4" />
      Supprimer
    </button>
  );
}
