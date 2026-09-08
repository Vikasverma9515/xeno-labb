"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import {
  LayoutDashboard,
  Users,
  Radio,
  Gauge,
  Sparkles,
  ChevronDown,
  ExternalLink,
} from "lucide-react";

const MENU = [
  { href: "/", label: "Overview", icon: LayoutDashboard },
  { href: "/segments", label: "RFM Segments", icon: Users, badge: "6" },
  { href: "/channels", label: "Channels & Timing", icon: Radio, badge: "4" },
];

const OTHERS = [
  { href: "/query-lab", label: "Query Lab", icon: Gauge },
  { href: "/assistant", label: "AI Assistant", icon: Sparkles },
];

function NavItem({
  href,
  label,
  icon: Icon,
  badge,
  active,
}: {
  href: string;
  label: string;
  icon: React.ComponentType<{ size?: number; strokeWidth?: number }>;
  badge?: string;
  active: boolean;
}) {
  return (
    <Link
      href={href}
      className={`flex items-center gap-3 px-3.5 py-2.5 rounded-full text-sm transition-colors ${
        active
          ? "bg-primary text-primary-foreground"
          : "text-foreground/70 hover:bg-surface-2"
      }`}
    >
      <Icon size={17} strokeWidth={2} />
      <span className="flex-1">{label}</span>
      {badge && (
        <span
          className={`text-[11px] font-semibold rounded-full px-1.5 py-0.5 min-w-[20px] text-center ${
            active ? "bg-white/20 text-white" : "bg-surface-2 text-muted"
          }`}
        >
          {badge}
        </span>
      )}
    </Link>
  );
}

export default function Sidebar() {
  const pathname = usePathname();
  const isActive = (href: string) => (href === "/" ? pathname === "/" : pathname.startsWith(href));

  return (
    <aside className="w-72 shrink-0 h-screen sticky top-0 border-r border-border flex flex-col bg-surface">
      <div className="h-[76px] flex items-center px-6 border-b border-border">
        <div className="flex items-center gap-2.5">
          <div className="h-9 w-9 rounded-xl bg-primary flex items-center justify-center font-bold text-sm text-primary-foreground">
            X
          </div>
          <div className="flex items-center gap-1.5">
            <span className="font-semibold text-[15px]">Xeno Analytics Lab</span>
            <span className="pill bg-success-bg text-success text-[10px] px-1.5 py-0.5">Live</span>
          </div>
          <ChevronDown size={14} className="text-muted" />
        </div>
      </div>

      <nav className="flex-1 px-4 pt-5 overflow-y-auto">
        <div className="text-[11px] font-semibold text-muted uppercase tracking-wide px-3 mb-2">Menu</div>
        <div className="space-y-1">
          {MENU.map((item) => (
            <NavItem key={item.href} {...item} active={isActive(item.href)} />
          ))}
        </div>

        <div className="text-[11px] font-semibold text-muted uppercase tracking-wide px-3 mb-2 mt-6">
          Others
        </div>
        <div className="space-y-1">
          {OTHERS.map((item) => (
            <NavItem key={item.href} {...item} active={isActive(item.href)} />
          ))}
        </div>
      </nav>

      <div className="p-4 border-t border-border">
        <a
          href="https://github.com/Vikasverma9515/xeno-labb"
          target="_blank"
          rel="noreferrer"
          className="flex items-center gap-3 rounded-2xl border border-border bg-surface-2 px-3.5 py-3 hover:border-accent/40 transition-colors"
        >
          <div className="h-8 w-8 rounded-full bg-gradient-to-br from-accent to-accent-2 flex items-center justify-center text-white text-xs font-semibold shrink-0">
            X
          </div>
          <div className="min-w-0">
            <div className="text-xs font-medium truncate">View source on GitHub</div>
            <div className="text-[11px] text-muted truncate">RFM &amp; channel-optimization SQL lab</div>
          </div>
          <ExternalLink size={13} className="text-muted ml-auto shrink-0" />
        </a>
      </div>
    </aside>
  );
}
