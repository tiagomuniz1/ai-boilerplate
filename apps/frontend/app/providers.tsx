'use client'

import { QueryClientProvider } from '@tanstack/react-query'
import { ReactQueryDevtools } from '@tanstack/react-query-devtools'
import { useState } from 'react'
import { createQueryClient } from '@/lib/react-query.config'
import { useApplyTheme } from '@/hooks/use-apply-theme.hook'
import { installZodErrorMap } from '@/lib/zod-error-map'

// At module scope, so it is in place before any form schema is parsed. Error
// maps are consulted at parse time, so schemas defined earlier still get it.
installZodErrorMap()

function ThemeApplier() {
  useApplyTheme()
  return null
}

export function Providers({ children }: { children: React.ReactNode }) {
  const [queryClient] = useState(() => createQueryClient())

  return (
    <QueryClientProvider client={queryClient}>
      <ThemeApplier />
      {children}
      <ReactQueryDevtools initialIsOpen={false} />
    </QueryClientProvider>
  )
}
