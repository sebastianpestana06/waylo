"use client";

import { useEffect } from "react";

/** Registers SW in production only; clears stale workers in development. */
export function RegisterSW() {
  useEffect(() => {
    if (typeof window === "undefined" || !("serviceWorker" in navigator)) return;

    if (process.env.NODE_ENV !== "production") {
      navigator.serviceWorker.getRegistrations().then((regs) => {
        regs.forEach((r) => r.unregister());
      });
      caches.keys().then((keys) => keys.forEach((k) => caches.delete(k)));
      return;
    }

    navigator.serviceWorker.register("/sw.js").catch(() => {
      /* ignore */
    });
  }, []);
  return null;
}
