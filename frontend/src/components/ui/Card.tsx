import { type HTMLAttributes, forwardRef } from 'react'
import { cn } from '../../lib/utils'

interface CardProps extends HTMLAttributes<HTMLDivElement> {
  glass?: boolean
  hover?: boolean
  padding?: 'none' | 'sm' | 'md' | 'lg'
}

export const Card = forwardRef<HTMLDivElement, CardProps>(
  ({ glass, hover, padding = 'md', className, children, ...props }, ref) => {
    return (
      <div
        ref={ref}
        className={cn(
          'rounded-3xl border transition-all duration-300',
          glass
            ? 'glass-card'
            : 'bg-surface border-surface-border shadow-card',
          hover && [
            'hover:shadow-card-hover hover:-translate-y-px cursor-pointer',
            'hover:border-accent/20',
          ],
          {
            'p-0':  padding === 'none',
            'p-4':  padding === 'sm',
            'p-5':  padding === 'md',
            'p-7':  padding === 'lg',
          },
          className
        )}
        {...props}
      >
        {children}
      </div>
    )
  }
)
Card.displayName = 'Card'
