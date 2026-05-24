type BadgeVariant = 'status' | 'type' | 'accent'

export function Badge({
  children,
  variant = 'status',
}: {
  children: React.ReactNode
  variant?: BadgeVariant
}) {
  const styles: Record<BadgeVariant, string> = {
    status: 'rounded-md border border-vein-border bg-vein-bg px-2 py-0.5 text-xs text-vein-muted',
    type: 'rounded-full bg-vein-accent/20 px-2.5 py-0.5 text-xs font-medium text-vein-accent',
    accent: 'rounded-md bg-vein-accent/15 px-2 py-0.5 text-xs text-vein-accent',
  }
  return <span className={styles[variant]}>{children}</span>
}
