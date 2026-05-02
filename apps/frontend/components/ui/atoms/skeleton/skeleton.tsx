import { type HTMLAttributes } from 'react'
import { cn } from '@/lib/cn'

export interface SkeletonProps extends HTMLAttributes<HTMLDivElement> {
    width?: string | number
    height?: string | number
}

export function Skeleton({ width, height, className, style, ...props }: SkeletonProps) {
    return (
        <div
            aria-hidden="true"
            className={cn(
                'rounded-md bg-surface-2 animate-pulse',
                className,
            )}
            style={{
                width: typeof width === 'number' ? `${width}px` : width,
                height: typeof height === 'number' ? `${height}px` : height,
                ...style,
            }}
            {...props}
        />
    )
}
