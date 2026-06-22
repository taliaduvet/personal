import Link from "next/link";
import { BrandMark } from "./icons";
import { NewTaskButton } from "./NewTaskButton";

export function TopBar() {
  return (
    <header className="sticky top-0 z-10 flex items-center justify-between border-b border-border bg-surface/80 px-4 py-3 pt-safe backdrop-blur md:px-8">
      <Link href="/" className="flex items-center gap-2 md:hidden">
        <span className="grid h-7 w-7 place-items-center rounded-lg bg-accent text-white">
          <BrandMark className="h-4 w-4" />
        </span>
        <span className="font-display font-semibold tracking-tight text-ink">Studio OS</span>
      </Link>

      <div className="hidden md:block" />

      <NewTaskButton
        className="inline-flex items-center gap-1.5 rounded-lg bg-accent px-3 py-1.5 text-sm font-medium text-white transition-colors hover:bg-accent-ink"
      />
    </header>
  );
}
