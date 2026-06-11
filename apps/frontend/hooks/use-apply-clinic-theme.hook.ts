'use client'

import { useEffect } from 'react'
import { useActiveTheme } from '@/components/features/themes/hooks/use-active-theme.hook'

export function useApplyClinicTheme(): void {
  const { data: theme } = useActiveTheme()

  useEffect(() => {
    const root = document.documentElement
    if (theme) {
      root.style.setProperty('--accent', theme.accentColor)
      root.style.setProperty('--accentSoft', theme.accentSoftColor)
    } else {
      root.style.removeProperty('--accent')
      root.style.removeProperty('--accentSoft')
    }
  }, [theme])
}
