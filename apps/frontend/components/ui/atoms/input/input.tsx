import { forwardRef, type InputHTMLAttributes } from 'react'
import { cn } from '@/lib/cn'

export interface InputProps extends InputHTMLAttributes<HTMLInputElement> {
    label?: string
    error?: string
    helperText?: string
}

export const Input = forwardRef<HTMLInputElement, InputProps>(
    ({ label, error, helperText, id, className, disabled, ...props }, ref) => {
        const inputId = id ?? label?.toLowerCase().replace(/\s+/g, '-')

        return (
            <div className="flex flex-col gap-1.5">
                {label && (
                    <label
                        htmlFor={inputId}
                        className={cn(
                            'text-sm font-medium',
                            disabled ? 'text-text-disabled' : 'text-text-primary',
                        )}
                    >
                        {label}
                    </label>
                )}
                <input
                    ref={ref}
                    id={inputId}
                    disabled={disabled}
                    aria-invalid={!!error}
                    aria-describedby={
                        error
                            ? `${inputId}-error`
                            : helperText
                              ? `${inputId}-helper`
                              : undefined
                    }
                    className={cn(
                        'h-10 w-full rounded-md px-3 text-base',
                        'bg-surface border border-border',
                        'text-text-primary placeholder:text-text-disabled',
                        'transition-colors duration-150',
                        'focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary focus-visible:ring-offset-2 focus-visible:ring-offset-background',
                        error && 'border-error focus-visible:ring-error',
                        disabled && 'opacity-40 cursor-not-allowed',
                        className,
                    )}
                    {...props}
                />
                {error && (
                    <span id={`${inputId}-error`} role="alert" className="text-xs text-error">
                        {error}
                    </span>
                )}
                {!error && helperText && (
                    <span id={`${inputId}-helper`} className="text-xs text-text-secondary">
                        {helperText}
                    </span>
                )}
            </div>
        )
    },
)

Input.displayName = 'Input'
