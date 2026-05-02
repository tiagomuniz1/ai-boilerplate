import { type HTMLAttributes } from 'react'
import { cn } from '@/lib/cn'

type AlertVariant = 'success' | 'error' | 'warning' | 'info'

const variantConfig: Record<AlertVariant, { className: string; role: string }> = {
    success: {
        className: 'bg-good/10 border-good text-good',
        role: 'status',
    },
    error: {
        className: 'bg-danger/10 border-danger text-danger',
        role: 'alert',
    },
    warning: {
        className: 'bg-warn/10 border-warn text-warn',
        role: 'alert',
    },
    info: {
        className: 'bg-accent/10 border-accent text-accent',
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
