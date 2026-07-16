import { type InputHTMLAttributes, forwardRef, type ReactNode } from 'react'
import { cn } from '../../lib/utils'

interface InputProps extends InputHTMLAttributes<HTMLInputElement> {
  label?: string
  error?: string
  hint?: string
  leftIcon?: ReactNode
  rightIcon?: ReactNode
}

export const Input = forwardRef<HTMLInputElement, InputProps>(
  ({ label, error, hint, leftIcon, rightIcon, className, id, ...props }, ref) => {
    const inputId = id ?? label?.toLowerCase().replace(/\s+/g, '-')
    return (
      <div className="flex flex-col gap-1.5">
        {label && (
          <label htmlFor={inputId} className="text-xs font-semibold uppercase tracking-wider text-text-muted">
            {label}
          </label>
        )}
        <div className="relative flex items-center">
          {leftIcon && (
            <span className="absolute left-3.5 text-text-muted pointer-events-none">{leftIcon}</span>
          )}
          <input
            ref={ref}
            id={inputId}
            className={cn(
              'w-full rounded-2xl border border-surface-border bg-surface px-4 py-3 text-sm text-text-primary placeholder:text-text-muted',
              'transition-all duration-200',
              'focus:outline-none focus:border-accent/60 focus:bg-surface-hover',
              'focus:ring-4 focus:ring-accent/10',
              'disabled:opacity-50 disabled:cursor-not-allowed',
              error && 'border-red-400/60 focus:ring-red-400/10 focus:border-red-400',
              leftIcon && 'pl-10',
              rightIcon && 'pr-10',
              className
            )}
            {...props}
          />
          {rightIcon && (
            <span className="absolute right-3.5 text-text-muted">{rightIcon}</span>
          )}
        </div>
        {error && <p className="text-xs text-red-400 mt-0.5">{error}</p>}
        {hint && !error && <p className="text-xs text-text-muted mt-0.5">{hint}</p>}
      </div>
    )
  }
)
Input.displayName = 'Input'
