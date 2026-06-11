'use client'

import { useEffect } from 'react'
import { ThemeBorderRadius } from '@app/shared'
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

// Mix 4% of accent into the base background color — creates a subtle atmospheric
// tint so the whole canvas "breathes" the clinic brand without being noticeable.
export function computeBgLight(hex: string): string {
  const r = parseInt(hex.slice(1, 3), 16)
  const g = parseInt(hex.slice(3, 5), 16)
  const b = parseInt(hex.slice(5, 7), 16)
  const t = 0.04
  const br = Math.round(247 * (1 - t) + r * t)
  const bg = Math.round(246 * (1 - t) + g * t)
  const bb = Math.round(243 * (1 - t) + b * t)
  return `rgb(${br},${bg},${bb})`
}

export function computeBgDark(hex: string): string {
  const r = parseInt(hex.slice(1, 3), 16)
  const g = parseInt(hex.slice(3, 5), 16)
  const b = parseInt(hex.slice(5, 7), 16)
  const t = 0.04
  const br = Math.round(11 * (1 - t) + r * t)
  const bg = Math.round(18 * (1 - t) + g * t)
  const bb = Math.round(32 * (1 - t) + b * t)
  return `rgb(${br},${bg},${bb})`
}

const RADIUS_PRESETS: Record<ThemeBorderRadius, { sm: string; default: string; md: string; lg: string; xl: string }> = {
  [ThemeBorderRadius.SHARP]: { sm: '2px', default: '3px', md: '4px', lg: '6px', xl: '8px' },
  [ThemeBorderRadius.DEFAULT]: { sm: '4px', default: '6px', md: '8px', lg: '12px', xl: '16px' },
  [ThemeBorderRadius.ROUND]: { sm: '8px', default: '12px', md: '16px', lg: '24px', xl: '32px' },
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

      root.style.setProperty('--bgLight', theme.bgColor ?? computeBgLight(theme.accentColor))
      root.style.setProperty('--bgDark', theme.bgDarkColor ?? computeBgDark(theme.accentColor))

      const radii = RADIUS_PRESETS[theme.borderRadius ?? ThemeBorderRadius.DEFAULT]
      root.style.setProperty('--radius-sm', radii.sm)
      root.style.setProperty('--radius', radii.default)
      root.style.setProperty('--radius-md', radii.md)
      root.style.setProperty('--radius-lg', radii.lg)
      root.style.setProperty('--radius-xl', radii.xl)
    } else {
      root.style.removeProperty('--accentLight')
      root.style.removeProperty('--accentSoftLight')
      root.style.removeProperty('--accentDark')
      root.style.removeProperty('--accentSoftDark')

      root.style.removeProperty('--bgLight')
      root.style.removeProperty('--bgDark')

      root.style.removeProperty('--radius-sm')
      root.style.removeProperty('--radius')
      root.style.removeProperty('--radius-md')
      root.style.removeProperty('--radius-lg')
      root.style.removeProperty('--radius-xl')
    }
  }, [theme])
}
