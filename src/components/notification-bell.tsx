"use client";

import Link from "next/link";
import { useEffect, useRef, useState } from "react";

export type NotificationItem = { label: string; count: number; href: string };

export function NotificationBell({ items }: { items: NotificationItem[] }) {
  const [open, setOpen] = useState(false);
  const containerRef = useRef<HTMLDivElement>(null);
  const total = items.reduce((s, i) => s + i.count, 0);

  useEffect(() => {
    function handleClickOutside(e: MouseEvent) {
      if (containerRef.current && !containerRef.current.contains(e.target as Node)) setOpen(false);
    }
    document.addEventListener("mousedown", handleClickOutside);
    return () => document.removeEventListener("mousedown", handleClickOutside);
  }, []);

  return (
    <div ref={containerRef} className="relative">
      <button
        onClick={() => setOpen((o) => !o)}
        aria-label="Notifications"
        className="relative rounded-full border border-border p-2 text-sm hover:bg-brand-light"
      >
        🔔
        {total > 0 && (
          <span className="absolute -right-1 -top-1 flex h-4 min-w-4 items-center justify-center rounded-full bg-danger px-1 text-[10px] font-medium text-white">
            {total}
          </span>
        )}
      </button>
      {open && (
        <div className="absolute right-0 z-30 mt-1 w-64 overflow-hidden rounded-lg border border-border bg-surface shadow-lg">
          {items.filter((i) => i.count > 0).length === 0 ? (
            <p className="px-3 py-3 text-sm text-slate-500">Rien de nouveau.</p>
          ) : (
            items
              .filter((i) => i.count > 0)
              .map((i) => (
                <Link
                  key={i.href}
                  href={i.href}
                  onClick={() => setOpen(false)}
                  className="flex items-center justify-between px-3 py-2 text-sm hover:bg-brand-light"
                >
                  <span>{i.label}</span>
                  <span className="rounded-full bg-brand px-2 py-0.5 text-xs text-white">{i.count}</span>
                </Link>
              ))
          )}
        </div>
      )}
    </div>
  );
}
