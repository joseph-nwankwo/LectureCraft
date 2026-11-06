import { type ReactNode } from 'react'
import { Button } from '@/components/design-system/buttons/Button'
import { EmptyState as SharedEmptyState } from '@/components/design-system/feedback/EmptyState'

export interface EmptyStateProps {
  icon?: ReactNode
  title: string
  description?: string
  action?: {
    label: string
    onClick: () => void
    icon?: ReactNode
  }
  secondaryAction?: {
    label: string
    onClick: () => void
  }
  size?: 'sm' | 'md' | 'lg'
  className?: string
}

export function EmptyState({
  icon,
  title,
  description,
  action,
  secondaryAction,
  size = 'md',
  className,
}: EmptyStateProps) {
  return (
    <SharedEmptyState
      icon={icon}
      title={title}
      description={description}
      size={size}
      card={false}
      className={className}
      action={action && (
        <Button variant="primary" size="sm" leftIcon={action.icon} onClick={action.onClick}>
          {action.label}
        </Button>
      )}
      secondaryAction={secondaryAction && (
        <Button variant="ghost" size="sm" onClick={secondaryAction.onClick}>
          {secondaryAction.label}
        </Button>
      )}
    />
  )
}
