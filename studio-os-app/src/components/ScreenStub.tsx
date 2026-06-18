export function ScreenStub({
  title,
  blurb,
  phase = "M1",
}: {
  title: string;
  blurb: string;
  phase?: string;
}) {
  return (
    <section className="mx-auto max-w-2xl">
      <h1 className="font-display text-2xl font-semibold tracking-tight text-ink">{title}</h1>
      <p className="mt-1 text-muted">{blurb}</p>

      <div className="mt-6 rounded-xl border border-border bg-surface p-6">
        <span className="inline-flex items-center rounded-full bg-accent-soft px-2.5 py-1 text-xs font-semibold text-accent">
          Coming in {phase}
        </span>
        <p className="mt-3 text-sm text-muted">
          This screen&apos;s interface gets built in milestone {phase}. The foundation it sits on —
          navigation, the Soft Desk design system, sign-in, and home-screen install — is live now.
        </p>
      </div>
    </section>
  );
}
