import { type TextareaHTMLAttributes, forwardRef } from 'react'
import { cn } from '../../lib/utils'

interface TextareaProps extends TextareaHTMLAttributes<HTMLTextAreaElement> {
  label?: string
  error?: string
  hint?: string
}

export const Textarea = forwardRef<HTMLTextAreaElement, TextareaProps>(
  ({ label, error, hint, className, id, ...props }, ref) => {
    const inputId = id ?? label?.toLowerCase().replace(/\s+/g, '-')
    return (
      <div className="flex flex-col gap-1.5">
        {label && (
          <label htmlFor={inputId} className="text-xs font-semibold uppercase tracking-wider text-text-muted">
            {label}
          </label>
        )}
        <textarea
          ref={ref}
          id={inputId}
          className={cn(
            'w-full rounded-2xl border border-surface-border bg-surface px-4 py-3 text-sm text-text-primary placeholder:text-text-muted resize-none',
            'transition-all duration-200',
            'focus:outline-none focus:border-accent/60 focus:bg-surface-hover focus:ring-4 focus:ring-accent/10',
            'disabled:opacity-50 disabled:cursor-not-allowed',
            error && 'border-red-400/60 focus:ring-red-400/10 focus:border-red-400',
            className
          )}
          {...props}
        />
        {error && <p className="text-xs text-red-400 mt-0.5">{error}</p>}
        {hint && !error && <p className="text-xs text-text-muted mt-0.5">{hint}</p>}
      </div>
    )
  }
)
Textarea.displayName = 'Textarea'
