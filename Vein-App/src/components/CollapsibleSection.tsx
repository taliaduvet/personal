import { useState, type ReactNode } from 'react'

export function CollapsibleSection({
  title,
  summary,
  defaultOpen = false,
  children,
}: {
  title: string
  summary?: string
  defaultOpen?: boolean
  children: ReactNode
}) {
  const [open, setOpen] = useState(defaultOpen)

  return (
    <section className="mt-6 rounded-xl border border-vein-border bg-vein-surface/50">
      <button
        type="button"
        className="flex w-full items-center justify-between gap-3 px-4 py-3 text-left"
        onClick={() => setOpen((v) => !v)}
        aria-expanded={open}
      >
        <span>
          <span className="text-sm font-medium">{title}</span>
          {!open && summary && (
            <span className="mt-0.5 block text-xs text-vein-muted">{summary}</span>
          )}
        </span>
        <span className="shrink-0 text-xs text-vein-muted">{open ? '▲' : '▼'}</span>
      </button>
      {open && <div className="border-t border-vein-border px-4 py-4">{children}</div>}
    </section>
  )
}
