'use client'

import { useEffect } from 'react'
import { useThemeStore } from '@/stores/theme.store'

/**
 * Reflects the persisted theme onto <html> as the `.dark` class, which drives the
 * content-section palette (the `content-*` CSS variables in globals.css). The brand
 * sections (navbar, hero, security, final CTA, footer) stay dark regardless.
 */
export function useApplyTheme(): void {
  const theme = useThemeStore((s) => s.theme)

  useEffect(() => {
    const root = document.documentElement
    if (theme === 'dark') {
      root.classList.add('dark')
    } else {
      root.classList.remove('dark')
    }
  }, [theme])
}
