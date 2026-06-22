"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { BOTTOM_NAV, isActive } from "./nav";
import { NewTaskButton } from "./NewTaskButton";

export function BottomNav() {
  const pathname = usePathname();
  const left = BOTTOM_NAV.slice(0, 2);
  const right = BOTTOM_NAV.slice(2);

  return (
    <nav className="fixed inset-x-0 bottom-0 z-20 border-t border-border bg-surface/90 pb-safe backdrop-blur md:hidden">
      <div className="grid grid-cols-5 items-end px-2 pt-2">
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
      </div>
    </nav>
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
