"use client";

import { usePathname } from "next/navigation";
import { Search, SlidersHorizontal, Bell, Database } from "lucide-react";

const LABELS: Record<string, string> = {
  "/": "Overview",
  "/segments": "RFM Segments",
  "/channels": "Channels & Timing",
  "/query-lab": "Query Lab",
  "/assistant": "AI Assistant",
};

function currentLabel(pathname: string) {
  if (LABELS[pathname]) return LABELS[pathname];
  const match = Object.keys(LABELS).find((k) => k !== "/" && pathname.startsWith(k));
  return match ? LABELS[match] : "Overview";
}

export default function Topbar() {
  const pathname = usePathname();

  return (
    <header className="h-[76px] shrink-0 border-b border-border bg-surface/80 backdrop-blur sticky top-0 z-10 flex items-center gap-4 px-8">
      <div className="text-xs text-muted hidden sm:block">
        Xeno Analytics Lab <span className="mx-1">/</span>{" "}
        <span className="text-foreground font-medium">{currentLabel(pathname)}</span>
      </div>

      <div className="flex-1 max-w-md ml-auto">
        <div className="flex items-center gap-2 bg-surface-2 border border-border rounded-full px-4 py-2">
          <Search size={15} className="text-muted shrink-0" />
          <input
            placeholder="Search customers, segments…"
            className="bg-transparent outline-none text-sm flex-1 min-w-0 placeholder:text-muted"
          />
          <kbd className="text-[10px] text-muted border border-border rounded px-1.5 py-0.5 hidden md:block">
            ⌘K
          </kbd>
        </div>
      </div>

      <button className="h-10 w-10 rounded-full btn-ghost flex items-center justify-center shrink-0">
        <SlidersHorizontal size={15} />
      </button>
      <button className="h-10 w-10 rounded-full btn-ghost flex items-center justify-center shrink-0 relative">
        <Bell size={15} />
        <span className="absolute top-2 right-2.5 h-1.5 w-1.5 rounded-full bg-danger" />
      </button>

      <a
        href="https://www.getxeno.com"
        target="_blank"
        rel="noreferrer"
        className="btn-primary h-10 px-4 flex items-center gap-2 text-sm shrink-0"
      >
        <Database size={14} />
        Live dataset
      </a>
    </header>
  );
}
