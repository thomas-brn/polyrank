"use client";

import { Trash2, X } from "lucide-react";
import { useRef, useState } from "react";

export function DeleteButton() {
  const [open, setOpen] = useState(false);
  const formRef = useRef<HTMLFormElement>(null);

  return (
    <>
      <button
        ref={(node) => {
          formRef.current = node?.closest("form") ?? null;
        }}
        type="button"
        onClick={() => setOpen(true)}
        className="inline-flex items-center gap-1.5 rounded-lg border border-red-200 px-4 py-2 text-sm font-medium text-red-600 transition-colors hover:bg-red-50"
      >
        <Trash2 className="size-4" />
        Supprimer
      </button>

      {open && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-5">
          <div
            className="absolute inset-0 bg-black/40 backdrop-blur-sm"
            onClick={() => setOpen(false)}
          />

          <div className="relative w-full max-w-sm rounded-2xl bg-white p-5 shadow-lg">
            <div className="flex items-start justify-between">
              <h2 className="font-semibold text-slate-900">
                Supprimer ce match ?
              </h2>
              <button
                onClick={() => setOpen(false)}
                className="rounded-lg p-1.5 text-slate-500 hover:bg-slate-100"
                aria-label="Fermer"
              >
                <X size={20} />
              </button>
            </div>

            <p className="mt-2 text-sm text-slate-500">
              Cette action est irréversible.
            </p>

            <div className="mt-5 flex justify-end gap-3">
              <button
                type="button"
                onClick={() => setOpen(false)}
                className="rounded-lg border border-slate-300 px-4 py-2 text-sm font-medium text-slate-700 transition-colors hover:bg-slate-100"
              >
                Annuler
              </button>
              <button
                type="button"
                onClick={() => formRef.current?.requestSubmit()}
                className="inline-flex items-center gap-1.5 rounded-lg bg-red-600 px-4 py-2 text-sm font-medium text-white transition-colors hover:bg-red-700"
              >
                <Trash2 className="size-4" />
                Supprimer
              </button>
            </div>
          </div>
        </div>
      )}
    </>
  );
}
