import { type HTMLAttributes } from 'react'
import { cn } from '@/lib/cn'

export interface HeaderProps extends HTMLAttributes<HTMLElement> {
    logo?: React.ReactNode
    actions?: React.ReactNode
}

export function Header({ logo, actions, className, children, ...props }: HeaderProps) {
    return (
        <header
            className={cn(
                'flex h-16 items-center justify-between border-b border-border bg-surface px-6',
                className,
            )}
            {...props}
        >
            <div className="flex items-center gap-4">
                {logo}
                {children}
            </div>
            {actions && <div className="flex items-center gap-3">{actions}</div>}
        </header>
    )
}
