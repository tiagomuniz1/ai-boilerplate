'use client'

import { useApplyTheme } from '@/hooks/use-apply-theme.hook'

function ThemeApplier() {
  useApplyTheme()
  return null
}

export function Providers({ children }: { children: React.ReactNode }) {
  return (
    <>
      <ThemeApplier />
      {children}
    </>
  )
}
