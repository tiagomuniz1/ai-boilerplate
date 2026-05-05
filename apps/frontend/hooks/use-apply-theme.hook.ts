'use client'

import { useEffect } from 'react'
import { useThemeStore } from '@/stores/theme.store'

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
