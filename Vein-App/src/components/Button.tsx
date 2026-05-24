import type { ButtonHTMLAttributes, ReactNode } from 'react'

interface ButtonProps extends ButtonHTMLAttributes<HTMLButtonElement> {
  variant?: 'primary' | 'secondary' | 'ghost' | 'danger'
  children: ReactNode
}

export function Button({ variant = 'primary', className = '', children, ...props }: ButtonProps) {
  const base =
    'inline-flex min-h-11 items-center justify-center rounded-lg px-4 py-2 text-sm font-medium transition-colors active:scale-[0.98] disabled:opacity-50'
  const variants = {
    primary: 'bg-vein-accent text-vein-on-accent hover:bg-vein-accent/90',
    secondary: 'border border-vein-border bg-vein-surface text-vein-text hover:border-vein-accent-dim',
    ghost: 'text-vein-muted hover:text-vein-text',
    danger: 'border border-vein-error/40 text-vein-error hover:bg-vein-error/10',
  }
  return (
    <button className={`${base} ${variants[variant]} ${className}`} {...props}>
      {children}
    </button>
  )
}
