import { type SVGAttributes } from 'react'
import { cn } from '@/lib/cn'

const sizeMap = {
    xs: 12,
    sm: 16,
    md: 20,
    lg: 24,
    xl: 32,
}

export type IconSize = keyof typeof sizeMap

export interface IconProps extends SVGAttributes<SVGSVGElement> {
    size?: IconSize | number
    'aria-label'?: string
}

export function Icon({ size = 'md', className, children, 'aria-label': ariaLabel, ...props }: IconProps) {
    const px = typeof size === 'number' ? size : sizeMap[size]

    return (
        <svg
            xmlns="http://www.w3.org/2000/svg"
            width={px}
            height={px}
            viewBox="0 0 24 24"
            fill="none"
            stroke="currentColor"
            strokeWidth={2}
            strokeLinecap="round"
            strokeLinejoin="round"
            aria-label={ariaLabel}
            aria-hidden={ariaLabel ? undefined : true}
            role={ariaLabel ? 'img' : undefined}
            className={cn('shrink-0', className)}
            {...props}
        >
            {children}
        </svg>
    )
}
