'use client'

import { useEffect, useRef, type HTMLAttributes } from 'react'
import { cn } from '@/lib/cn'
import { Typography } from '../../atoms/typography/typography'
import { Button } from '../../atoms/button/button'

export interface ModalProps {
    isOpen: boolean
    onClose: () => void
    title?: string
    className?: string
    children: React.ReactNode
}

export function Modal({ isOpen, onClose, title, className, children }: ModalProps) {
    const dialogRef = useRef<HTMLDivElement>(null)
    const previousFocusRef = useRef<HTMLElement | null>(null)

    useEffect(() => {
        if (isOpen) {
            previousFocusRef.current = document.activeElement as HTMLElement
            dialogRef.current?.focus()
        } else {
            previousFocusRef.current?.focus()
        }
    }, [isOpen])

    useEffect(() => {
        function onKeyDown(e: KeyboardEvent) {
            if (e.key === 'Escape') onClose()
        }
        if (isOpen) {
            document.addEventListener('keydown', onKeyDown)
        }
        return () => document.removeEventListener('keydown', onKeyDown)
    }, [isOpen, onClose])

    if (!isOpen) return null

    return (
        <div
            data-testid="modal-backdrop"
            className="fixed inset-0 z-50 flex items-center justify-center"
            onClick={onClose}
        >
            <div aria-hidden="true" className="absolute inset-0 bg-background/80 backdrop-blur-sm" />
            <div
                ref={dialogRef}
                role="dialog"
                aria-modal="true"
                aria-labelledby={title ? 'modal-title' : undefined}
                tabIndex={-1}
                className={cn(
                    'relative z-10 w-full max-w-md rounded-lg bg-surface-elevated border border-border shadow-lg p-6',
                    'focus-visible:outline-none',
                    className,
                )}
                onClick={(e) => e.stopPropagation()}
            >
                <div className="flex items-start justify-between mb-4">
                    {title && (
                        <Typography variant="h3" id="modal-title">
                            {title}
                        </Typography>
                    )}
                    <Button
                        variant="ghost"
                        size="sm"
                        aria-label="Fechar"
                        onClick={onClose}
                        className="ml-auto"
                    >
                        <span aria-hidden="true">✕</span>
                    </Button>
                </div>
                {children}
            </div>
        </div>
    )
}
