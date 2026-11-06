import type { ReactNode } from 'react'
import { cn } from '@/lib/utils'

interface EmptyStateProps {
  icon?: ReactNode
  title: string
  description?: string
  action?: ReactNode
  secondaryAction?: ReactNode
  size?: 'sm' | 'md' | 'lg'
  card?: boolean
  className?: string
}

const sizeStyles = {
  sm: { wrap: 'py-8', icon: 'h-10 w-10', title: 'text-base', desc: 'text-sm' },
  md: { wrap: 'py-12', icon: 'h-14 w-14', title: 'text-lg', desc: 'text-sm' },
  lg: { wrap: 'py-16', icon: 'h-16 w-16', title: 'text-xl', desc: 'text-base' },
}

export function EmptyState({
  icon,
  title,
  description,
  action,
  secondaryAction,
  size = 'md',
  card = true,
  className,
}: EmptyStateProps) {
  const s = sizeStyles[size]

  return (
    <div className={cn(
      'flex flex-col items-center text-center px-6',
      s.wrap,
      card && 'rounded-lg border border-dashed border-border bg-card shadow-card',
      className,
    )} role="status">
      {icon && (
        <div className={cn('bg-muted text-muted-foreground flex items-center justify-center rounded-xl mb-4', s.icon)} aria-hidden>
          {icon}
        </div>
      )}
      <h3 className={cn('font-semibold text-foreground', s.title)}>{title}</h3>
      {description && <p className={cn('mt-1.5 text-muted-foreground max-w-sm', s.desc)}>{description}</p>}
      {(action || secondaryAction) && (
        <div className="mt-6 flex items-center gap-2">
          {action}
          {secondaryAction}
        </div>
      )}
    </div>
  )
}
