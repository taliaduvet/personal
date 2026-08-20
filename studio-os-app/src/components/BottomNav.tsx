"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { usePathname } from "next/navigation";
import { BOTTOM_NAV, MORE_NAV, isActive } from "./nav";
import { MoreIcon } from "./icons";
import { NewTaskButton } from "./NewTaskButton";

export function BottomNav() {
  const pathname = usePathname();
  const [moreOpen, setMoreOpen] = useState(false);
  const left = BOTTOM_NAV.slice(0, 2);
  const right = BOTTOM_NAV.slice(2);
  const moreActive = MORE_NAV.some((item) => isActive(pathname, item.href));

  useEffect(() => {
    setMoreOpen(false);
  }, [pathname]);

  return (
    <>
      <nav className="fixed inset-x-0 bottom-0 z-20 border-t border-border bg-surface/90 pb-safe backdrop-blur md:hidden">
        <div className="grid grid-cols-6 items-end px-2 pt-2">
          {left.map((item) => (
            <NavTab key={item.href} pathname={pathname} href={item.href} label={item.label} Icon={item.icon} />
          ))}

          <div className="flex justify-center">
            <NewTaskButton
              showLabel={false}
              iconClassName="h-6 w-6"
              aria-label="Quick add"
              className="-mt-6 grid h-14 w-14 place-items-center rounded-full bg-accent text-white shadow-sm shadow-accent/30 active:scale-95"
            />
          </div>

          {right.map((item) => (
            <NavTab key={item.href} pathname={pathname} href={item.href} label={item.label} Icon={item.icon} />
          ))}

          <button
            type="button"
            onClick={() => setMoreOpen((v) => !v)}
            aria-expanded={moreOpen}
            aria-label="More"
            className={[
              "flex flex-col items-center gap-1 px-1 py-1 text-[11px] font-medium transition-colors",
              moreActive || moreOpen ? "text-accent" : "text-faint",
            ].join(" ")}
          >
            <MoreIcon className="h-5 w-5" />
            More
          </button>
        </div>
      </nav>

      {moreOpen && (
        <div
          className="fixed inset-0 z-40 flex items-end justify-center bg-ink/25 md:hidden"
          onClick={() => setMoreOpen(false)}
        >
          <div
            className="w-full rounded-t-2xl border-t border-border bg-surface p-4 pb-[calc(env(safe-area-inset-bottom)+4.5rem)]"
            role="dialog"
            aria-label="More navigation"
            onClick={(e) => e.stopPropagation()}
          >
            <div className="mx-auto mb-4 h-1 w-10 rounded-full bg-border" />
            <div className="grid grid-cols-4 gap-3">
              {MORE_NAV.map((item) => {
                const active = isActive(pathname, item.href);
                const Icon = item.icon;
                return (
                  <Link
                    key={item.href}
                    href={item.href}
                    className="flex flex-col items-center gap-1.5 rounded-xl px-1 py-2 text-center text-[11px] font-medium text-muted transition-colors active:bg-canvas"
                  >
                    <span
                      className={[
                        "grid h-11 w-11 place-items-center rounded-xl",
                        active ? "bg-accent-soft text-accent" : "bg-canvas text-muted",
                      ].join(" ")}
                    >
                      <Icon className="h-5 w-5" />
                    </span>
                    {item.label}
                  </Link>
                );
              })}
            </div>
          </div>
        </div>
      )}
    </>
  );
}

function NavTab({
  pathname,
  href,
  label,
  Icon,
}: {
  pathname: string;
  href: string;
  label: string;
  Icon: React.ComponentType<React.SVGProps<SVGSVGElement>>;
}) {
  const active = isActive(pathname, href);
  return (
    <Link
      href={href}
      className={[
        "flex flex-col items-center gap-1 px-1 py-1 text-[11px] font-medium transition-colors",
        active ? "text-accent" : "text-faint",
      ].join(" ")}
    >
      <Icon className="h-5 w-5" />
      {label}
    </Link>
  );
}
