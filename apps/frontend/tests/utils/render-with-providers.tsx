import { render, RenderOptions } from '@testing-library/react'
import { QueryClientProvider } from '@tanstack/react-query'
import { createQueryClient } from '@/lib/react-query.config'

function AllProviders({ children }: { children: React.ReactNode }) {
  const queryClient = createQueryClient()
  queryClient.setDefaultOptions({ queries: { retry: false } })
  return <QueryClientProvider client={queryClient}>{children}</QueryClientProvider>
}

export function renderWithProviders(
  ui: React.ReactElement,
  options?: Omit<RenderOptions, 'wrapper'>,
) {
  return render(ui, { wrapper: AllProviders, ...options })
}
