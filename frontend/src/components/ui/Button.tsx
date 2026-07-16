import { type ButtonHTMLAttributes, forwardRef } from 'react'
import { cn } from '../../lib/utils'

type Variant = 'primary' | 'secondary' | 'ghost' | 'danger' | 'outline'
type Size = 'sm' | 'md' | 'lg'

interface ButtonProps extends ButtonHTMLAttributes<HTMLButtonElement> {
  variant?: Variant
  size?: Size
  loading?: boolean
  fullWidth?: boolean
}

export const Button = forwardRef<HTMLButtonElement, ButtonProps>(
  ({ variant = 'primary', size = 'md', loading, fullWidth, className, children, disabled, ...props }, ref) => {
    return (
      <button
        ref={ref}
        disabled={disabled || loading}
        className={cn(
          'inline-flex items-center justify-center gap-2 font-semibold rounded-2xl transition-all duration-200 ease-spring select-none',
          'focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-accent focus-visible:ring-offset-2 focus-visible:ring-offset-bg-primary',
          'disabled:opacity-40 disabled:cursor-not-allowed disabled:transform-none',
          {
            // Primary — gradient fill, subtle glow on hover
            'bg-accent-gradient text-white shadow-sm hover:shadow-glow-sm hover:brightness-110 active:scale-[0.97]': variant === 'primary',
            // Secondary — bordered surface
            'bg-surface text-text-primary hover:bg-surface-hover border border-surface-border active:scale-[0.97] shadow-inner-glow': variant === 'secondary',
            // Ghost — no bg
            'text-text-secondary hover:text-text-primary hover:bg-surface-hover': variant === 'ghost',
            // Danger — red tint
            'bg-red-500/10 text-red-500 hover:bg-red-500/20 border border-red-500/20 active:scale-[0.97]': variant === 'danger',
            // Outline — neutral border
            'border border-surface-border text-text-primary hover:bg-surface-hover hover:border-accent/30 active:scale-[0.97]': variant === 'outline',
            // Sizes
            'text-xs px-3 py-1.5 rounded-xl': size === 'sm',
            'text-sm px-5 py-2.5': size === 'md',
            'text-base px-7 py-3.5': size === 'lg',
            'w-full': fullWidth,
          },
          className
        )}
        {...props}
      >
        {loading && (
          <svg className="animate-spin h-4 w-4 shrink-0" viewBox="0 0 24 24" fill="none">
            <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" />
            <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4z" />
          </svg>
        )}
        {children}
      </button>
    )
  }
)
Button.displayName = 'Button'
