import Link from "next/link";

const PAGES = [
  {
    href: "/design/methodology",
    title: "Planning methodology — locked",
    desc: "Receipt → Horizon → Intention. Start triggers, Review handoff, Today contract.",
    primary: true,
  },
  {
    href: "/design/week-planning",
    title: "Plan the week — stepped wizard",
    desc: "4 steps: approve work → place modes (approved visible) → lock with week overview.",
    primary: false,
  },
  {
    href: "/design/today",
    title: "Today — plan execution",
    desc: "Split desk mock — mode day vs open day toggle. Wireframe spec linked inside.",
    primary: false,
  },
  {
    href: "/design/layouts",
    title: "Functional layouts (the map)",
    desc: "Every screen — zones, hierarchy, taps. Reference, not final layouts.",
    primary: false,
  },
  {
    href: "/design/task-open",
    title: "Work View",
    desc: "Full task page — subtasks, notes, metadata chips.",
    primary: false,
  },
];

export default function DesignLabPage() {
  return (
    <div className="mx-auto max-w-2xl space-y-6 px-6 py-12">
      <header>
        <p className="text-sm text-muted">Studio OS</p>
        <h1 className="font-display text-3xl font-semibold tracking-tight text-ink">Design lab</h1>
        <p className="mt-2 text-muted">Layout and function first. Pretty comes after we agree on the map.</p>
      </header>

      <ul className="space-y-3">
        {PAGES.map((p) => (
          <li key={p.href}>
            <Link
              href={p.href}
              className={[
                "block rounded-xl border p-5 transition-colors hover:border-accent",
                p.primary ? "border-accent bg-accent-soft/20" : "border-border bg-surface",
              ].join(" ")}
            >
              <p className="font-display text-lg font-semibold text-ink">{p.title}</p>
              <p className="mt-1 text-sm text-muted">{p.desc}</p>
            </Link>
          </li>
        ))}
      </ul>
    </div>
  );
}
