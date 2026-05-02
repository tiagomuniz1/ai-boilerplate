import { type ElementType, type HTMLAttributes } from 'react'
import { cn } from '@/lib/cn'

type TypographyVariant = 'h1' | 'h2' | 'h3' | 'body' | 'caption'

const variantConfig: Record<
    TypographyVariant,
    { tag: ElementType; className: string }
> = {
    h1: { tag: 'h1', className: 'text-3xl font-bold text-text' },
    h2: { tag: 'h2', className: 'text-2xl font-semibold text-text' },
    h3: { tag: 'h3', className: 'text-xl font-semibold text-text' },
    body: { tag: 'p', className: 'text-base text-text' },
    caption: { tag: 'span', className: 'text-xs text-text-dim' },
}

export interface TypographyProps extends HTMLAttributes<HTMLElement> {
    variant?: TypographyVariant
    as?: ElementType
}

export function Typography({
    variant = 'body',
    as,
    className,
    children,
    ...props
}: TypographyProps) {
    const { tag: DefaultTag, className: variantClass } = variantConfig[variant]
    const Tag = as ?? DefaultTag

    return (
        <Tag className={cn(variantClass, className)} {...props}>
            {children}
        </Tag>
    )
}
