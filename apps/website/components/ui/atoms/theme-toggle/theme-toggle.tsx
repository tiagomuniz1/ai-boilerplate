'use client'

import { useEffect, useState } from 'react'
import { useThemeStore } from '@/stores/theme.store'
import { cn } from '@/lib/cn'

export interface ThemeToggleProps {
  className?: string
}

/**
 * Outline button in the navbar that flips the content-section palette between light and
 * dark. The label reflects the action, not the current state ("Modo escuro" while light).
 *
 * The theme is derived from `prefers-color-scheme`/localStorage on the client, which the
 * server can't know — so the label only reflects the real theme after mount, keeping the
 * first client render identical to the server output (no hydration mismatch).
 */
export function ThemeToggle({ className }: ThemeToggleProps) {
  const theme = useThemeStore((s) => s.theme)
  const toggleTheme = useThemeStore((s) => s.toggleTheme)
  const [mounted, setMounted] = useState(false)

  useEffect(() => setMounted(true), [])

  const isDark = mounted && theme === 'dark'

  return (
    <button
      type="button"
      onClick={toggleTheme}
      aria-pressed={isDark}
      data-testid="theme-toggle"
      className={cn(
        'rounded-md border border-warm-white/30 bg-transparent px-3.5 py-2 text-xs font-semibold text-warm-white',
        'transition-colors duration-150 hover:border-terracotta hover:text-terracotta',
        className,
      )}
    >
      {isDark ? 'Modo claro' : 'Modo escuro'}
    </button>
  )
}
