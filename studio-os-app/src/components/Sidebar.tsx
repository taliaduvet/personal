"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { SIDEBAR_NAV, isActive } from "./nav";
import { BrandMark } from "./icons";
import { useTheme } from "@/lib/use-theme";

export function Sidebar() {
  const pathname = usePathname();
  const { theme, setTheme } = useTheme();
  return (
    <aside className="hidden border-r border-border bg-surface px-3 py-5 md:flex md:flex-col">
      <Link href="/" className="mb-5 flex items-center gap-2 px-2">
        <span className="grid h-8 w-8 place-items-center rounded-lg bg-accent text-white">
          <BrandMark className="h-5 w-5" />
        </span>
        <span className="font-display text-lg font-semibold tracking-tight text-ink">
          Studio OS
        </span>
      </Link>

      <nav className="flex flex-col gap-0.5">
        {SIDEBAR_NAV.map((item) => {
          const active = isActive(pathname, item.href);
          const Icon = item.icon;
          return (
            <Link
              key={item.href}
              href={item.href}
              className={[
                "flex items-center gap-3 rounded-lg px-3 py-2 text-sm font-medium transition-colors",
                active
                  ? "bg-accent-soft text-accent"
                  : "text-muted hover:bg-canvas hover:text-ink",
              ].join(" ")}
            >
              <Icon className="h-[18px] w-[18px]" />
              {item.label}
            </Link>
          );
        })}
      </nav>

      <div className="mt-auto px-3 pt-6">
        <div className="mb-3 flex items-center gap-1 rounded-xl border border-border bg-canvas p-1">
          {(["light", "system", "dark"] as const).map((t) => (
            <button
              key={t}
              type="button"
              onClick={() => setTheme(t)}
              title={t.charAt(0).toUpperCase() + t.slice(1)}
              className={[
                "flex-1 rounded-lg py-1.5 text-[11px] font-medium capitalize transition-colors",
                theme === t ? "bg-surface text-ink shadow-sm" : "text-faint hover:text-muted",
              ].join(" ")}
            >
              {t === "light" ? "☀︎" : t === "dark" ? "☽" : "Auto"}
            </button>
          ))}
        </div>
        <p className="text-xs text-faint">Studio OS · v0 foundation</p>
      </div>
    </aside>
  );
}
