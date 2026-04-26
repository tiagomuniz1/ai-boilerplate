import { type HTMLAttributes } from 'react'
import { cn } from '@/lib/cn'

export interface SidebarProps extends HTMLAttributes<HTMLElement> {
    isCollapsed?: boolean
}

export function Sidebar({ isCollapsed = false, className, children, ...props }: SidebarProps) {
    return (
        <aside
            data-collapsed={isCollapsed}
            className={cn(
                'flex flex-col border-r border-border bg-surface transition-all duration-200',
                isCollapsed ? 'w-16' : 'w-64',
                className,
            )}
            {...props}
        >
            {children}
        </aside>
    )
}

export interface SidebarItemProps extends HTMLAttributes<HTMLAnchorElement | HTMLButtonElement> {
    icon?: React.ReactNode
    label: string
    isActive?: boolean
    as?: 'a' | 'button'
    href?: string
}

export function SidebarItem({
    icon,
    label,
    isActive = false,
    as: Tag = 'button',
    className,
    ...props
}: SidebarItemProps) {
    return (
        <Tag
            aria-current={isActive ? 'page' : undefined}
            className={cn(
                'flex w-full items-center gap-3 px-4 py-2.5 text-sm font-medium rounded-md mx-2',
                'transition-colors duration-150',
                'focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary focus-visible:ring-offset-2 focus-visible:ring-offset-background',
                isActive
                    ? 'bg-primary/10 text-primary'
                    : 'text-text-secondary hover:bg-surface-elevated hover:text-text-primary',
                className,
            )}
            {...(props as any)}
        >
            {icon && <span className="shrink-0">{icon}</span>}
            <span>{label}</span>
        </Tag>
    )
}
