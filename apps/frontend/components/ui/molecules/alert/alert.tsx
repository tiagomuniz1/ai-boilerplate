import { type HTMLAttributes } from 'react'
import { cn } from '@/lib/cn'

type AlertVariant = 'success' | 'error' | 'warning' | 'info'

const variantConfig: Record<AlertVariant, { className: string; role: string }> = {
    success: {
        className: 'bg-success/10 border-success text-success',
        role: 'status',
    },
    error: {
        className: 'bg-error/10 border-error text-error',
        role: 'alert',
    },
    warning: {
        className: 'bg-warning/10 border-warning text-warning',
        role: 'alert',
    },
    info: {
        className: 'bg-info/10 border-info text-info',
        role: 'status',
    },
}

export interface AlertProps extends HTMLAttributes<HTMLDivElement> {
    variant?: AlertVariant
}

export function Alert({ variant = 'info', className, children, ...props }: AlertProps) {
    const { className: variantClass, role } = variantConfig[variant]

    return (
        <div
            role={role}
            className={cn(
                'rounded-md border px-4 py-3 text-sm',
                variantClass,
                className,
            )}
            {...props}
        >
            {children}
        </div>
    )
}
