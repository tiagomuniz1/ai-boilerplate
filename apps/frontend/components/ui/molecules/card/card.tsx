import { type HTMLAttributes } from 'react'
import { cn } from '@/lib/cn'
import { Typography } from '../../atoms/typography/typography'

export interface CardProps extends HTMLAttributes<HTMLDivElement> {
    title?: string
}

export function Card({ title, className, children, ...props }: CardProps) {
    return (
        <div
            className={cn(
                'rounded-lg bg-surface-elevated border border-border p-6 shadow',
                className,
            )}
            {...props}
        >
            {title && (
                <Typography variant="h3" className="mb-4">
                    {title}
                </Typography>
            )}
            {children}
        </div>
    )
}
