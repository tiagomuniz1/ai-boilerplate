'use client'

import { useEffect } from 'react'
import { useActiveTheme } from '@/components/features/themes/hooks/use-active-theme.hook'

// Mix accent color with white at 40% — produces a lighter, less saturated
// variant suitable for use on dark backgrounds.
export function computeDarkAccent(hex: string): string {
  const r = parseInt(hex.slice(1, 3), 16)
  const g = parseInt(hex.slice(3, 5), 16)
  const b = parseInt(hex.slice(5, 7), 16)
  const t = 0.4
  const dr = Math.round(r + (255 - r) * t)
  const dg = Math.round(g + (255 - g) * t)
  const db = Math.round(b + (255 - b) * t)
  return `#${dr.toString(16).padStart(2, '0')}${dg.toString(16).padStart(2, '0')}${db.toString(16).padStart(2, '0')}`
}

// 18% of accent + small base offset — produces a very dark tinted background
// suitable for active/highlighted elements on dark surfaces.
export function computeDarkSoft(hex: string): string {
  const r = parseInt(hex.slice(1, 3), 16)
  const g = parseInt(hex.slice(3, 5), 16)
  const b = parseInt(hex.slice(5, 7), 16)
  const factor = 0.18
  const base = 6
  const dr = Math.min(255, Math.round(r * factor + base))
  const dg = Math.min(255, Math.round(g * factor + base))
  const db = Math.min(255, Math.round(b * factor + base))
  return `#${dr.toString(16).padStart(2, '0')}${dg.toString(16).padStart(2, '0')}${db.toString(16).padStart(2, '0')}`
}

export function useApplyClinicTheme(): void {
  const { data: theme } = useActiveTheme()

  useEffect(() => {
    const root = document.documentElement
    if (theme) {
      root.style.setProperty('--accentLight', theme.accentColor)
      root.style.setProperty('--accentSoftLight', theme.accentSoftColor)
      root.style.setProperty('--accentDark', computeDarkAccent(theme.accentColor))
      root.style.setProperty('--accentSoftDark', computeDarkSoft(theme.accentColor))
    } else {
      root.style.removeProperty('--accentLight')
      root.style.removeProperty('--accentSoftLight')
      root.style.removeProperty('--accentDark')
      root.style.removeProperty('--accentSoftDark')
    }
  }, [theme])
}
