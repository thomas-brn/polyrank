"use client";

import { useCallback, useEffect, useRef, useState } from "react";

/** Retourne [secondes restantes, démarrer le compte à rebours]. */
export function useCooldown(duration: number): [number, () => void] {
  const [remaining, setRemaining] = useState(0);
  const timer = useRef<ReturnType<typeof setInterval> | null>(null);

  const start = useCallback(() => {
    if (timer.current) clearInterval(timer.current);
    setRemaining(duration);
    timer.current = setInterval(() => {
      setRemaining((s) => {
        if (s <= 1) {
          clearInterval(timer.current!);
          return 0;
        }
        return s - 1;
      });
    }, 1000);
  }, [duration]);

  useEffect(() => () => { if (timer.current) clearInterval(timer.current); }, []);

  return [remaining, start];
}
