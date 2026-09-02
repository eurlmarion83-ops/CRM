"use client";

import { useEffect } from "react";

export function RegisterServiceWorker() {
  useEffect(() => {
    if (process.env.NODE_ENV !== "production") return; // évite les conflits avec le HMR en dev
    if ("serviceWorker" in navigator) {
      navigator.serviceWorker.register("/sw.js").catch(() => {
        // installation hors-ligne non critique : on n'interrompt pas l'usage de l'app si ça échoue
      });
    }
  }, []);

  return null;
}
