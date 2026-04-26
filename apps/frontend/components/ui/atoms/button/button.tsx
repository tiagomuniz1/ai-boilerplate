'use client'

import { forwardRef, type ButtonHTMLAttributes } from 'react'
import { cn } from '@/lib/cn'

export interface ButtonProps extends ButtonHTMLAttributes<HTMLButtonElement> {
    variant?: 'primary' | 'secondary' | 'ghost'
    size?: 'sm' | 'md' | 'lg'
    isLoading?: boolean
}

const variantClasses: Record<NonNullable<ButtonProps['variant']>, string> = {
    primary:
        'bg-primary text-primary-foreground hover:bg-primary-hover focus-visible:ring-primary',
    secondary:
        'bg-secondary text-secondary-foreground hover:bg-secondary-hover focus-visible:ring-secondary',
    ghost:
        'bg-transparent text-text-primary hover:bg-surface-elevated focus-visible:ring-text-secondary border border-border',
}

const sizeClasses: Record<NonNullable<ButtonProps['size']>, string> = {
    sm: 'h-8 px-3 text-sm gap-1.5',
    md: 'h-10 px-4 text-base gap-2',
    lg: 'h-12 px-6 text-md gap-2',
}

export const Button = forwardRef<HTMLButtonElement, ButtonProps>(
    (
        {
            variant = 'primary',
            size = 'md',
            isLoading = false,
            disabled,
            className,
            children,
            ...props
        },
        ref,
    ) => {
        return (
            <button
                ref={ref}
                disabled={disabled || isLoading}
                aria-busy={isLoading}
                className={cn(
                    'inline-flex items-center justify-center font-medium rounded-md',
                    'transition-colors duration-150',
                    'focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-offset-2 focus-visible:ring-offset-background',
                    'disabled:opacity-40 disabled:cursor-not-allowed',
                    variantClasses[variant],
                    sizeClasses[size],
                    className,
                )}
                {...props}
            >
                {isLoading && (
                    <span
                        aria-hidden="true"
                        className="inline-block w-4 h-4 border-2 border-current border-t-transparent rounded-full animate-spin shrink-0"
                    />
                )}
                {children}
            </button>
        )
    },
)

Button.displayName = 'Button'
