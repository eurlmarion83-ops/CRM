"use client";

import { useEffect, useState } from "react";

export function ThemeToggle() {
  const [theme, setTheme] = useState<"light" | "dark" | null>(null);

  useEffect(() => {
    // eslint-disable-next-line react-hooks/set-state-in-effect -- lit l'attribut posé par le script anti-flash au premier rendu
    setTheme((document.documentElement.getAttribute("data-theme") as "light" | "dark") ?? "light");
  }, []);

  function toggle() {
    const next = theme === "dark" ? "light" : "dark";
    setTheme(next);
    document.documentElement.setAttribute("data-theme", next);
    try {
      localStorage.setItem("theme", next);
    } catch {
      // stockage indisponible (navigation privée...) : le choix ne persiste pas, sans bloquer l'usage
    }
  }

  if (theme === null) return null; // évite un mismatch d'hydratation le temps de lire l'attribut

  return (
    <button
      onClick={toggle}
      aria-label="Changer de thème"
      className="rounded-full border border-border px-3 py-1.5 text-xs hover:bg-brand-light"
    >
      {theme === "dark" ? "☀️ Clair" : "🌙 Sombre"}
    </button>
  );
}
