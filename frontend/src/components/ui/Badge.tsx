import { type HTMLAttributes } from 'react'
import { cn } from '../../lib/utils'

type Variant = 'default' | 'success' | 'warning' | 'danger' | 'accent' | 'outline' | 'verified' | 'gold' | 'silver'

interface BadgeProps extends HTMLAttributes<HTMLSpanElement> {
  variant?: Variant
  size?: 'sm' | 'md'
}

export function Badge({ variant = 'default', size = 'md', className, children, ...props }: BadgeProps) {
  return (
    <span
      className={cn(
        'inline-flex items-center gap-1 rounded-full font-medium',
        size === 'sm' ? 'px-2 py-px text-[10px]' : 'px-2.5 py-0.5 text-xs',
        {
          'bg-surface-hover text-text-secondary': variant === 'default',
          'bg-green-500/10 text-green-500': variant === 'success',
          'bg-yellow-500/10 text-yellow-500': variant === 'warning',
          'bg-red-500/10 text-red-500': variant === 'danger',
          'bg-accent-subtle text-accent': variant === 'accent',
          'border border-surface-border text-text-secondary': variant === 'outline',
          'bg-orange-500/15 text-orange-500 border border-orange-500/30': variant === 'verified',
          'bg-yellow-500/15 text-yellow-600 border border-yellow-500/40': variant === 'gold',
          'bg-gray-400/15 text-gray-500 border border-gray-400/40': variant === 'silver',
        },
        className
      )}
      {...props}
    >
      {children}
    </span>
  )
}
