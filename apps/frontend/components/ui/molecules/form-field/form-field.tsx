import { type HTMLAttributes } from 'react'
import { cn } from '@/lib/cn'
import { Label } from '../../atoms/label/label'

export interface FormFieldProps extends HTMLAttributes<HTMLDivElement> {
    label: string
    htmlFor: string
    error?: string
    required?: boolean
}

export function FormField({
    label,
    htmlFor,
    error,
    required,
    className,
    children,
    ...props
}: FormFieldProps) {
    return (
        <div className={cn('flex flex-col gap-1.5', className)} {...props}>
            <Label htmlFor={htmlFor} required={required}>
                {label}
            </Label>
            {children}
            {error && (
                <span role="alert" className="text-xs text-error">
                    {error}
                </span>
            )}
        </div>
    )
}
