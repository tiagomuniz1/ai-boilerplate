jest.mock('../use-cases/get-current-clinic.use-case')
jest.mock('@/stores/auth.store')

import React from 'react'
import { renderHook, waitFor } from '@testing-library/react'
import { QueryClientProvider } from '@tanstack/react-query'
import { createQueryClient } from '@/lib/react-query.config'
import { getCurrentClinicUseCase } from '../use-cases/get-current-clinic.use-case'
import { useAuthStore } from '@/stores/auth.store'
import { useCurrentClinic } from './use-current-clinic.hook'

function wrapper({ children }: { children: React.ReactNode }) {
  const client = createQueryClient()
  client.setDefaultOptions({ queries: { retry: false } })
  return React.createElement(QueryClientProvider, { client }, children)
}

const mockUseAuthStore = useAuthStore as jest.MockedFunction<typeof useAuthStore>

describe('useCurrentClinic', () => {
  beforeEach(() => jest.clearAllMocks())

  it('is disabled when user has no clinicId', () => {
    mockUseAuthStore.mockReturnValue(null as any)
    const { result } = renderHook(() => useCurrentClinic(), { wrapper })
    expect(result.current.fetchStatus).toBe('idle')
    expect(getCurrentClinicUseCase).not.toHaveBeenCalled()
  })

  it('is disabled when user is null', () => {
    mockUseAuthStore.mockReturnValue(null as any)
    const { result } = renderHook(() => useCurrentClinic(), { wrapper })
    expect(result.current.fetchStatus).toBe('idle')
  })

  it('fetches clinic when user has clinicId', async () => {
    const clinicId = 'clinic-uuid-1'
    mockUseAuthStore.mockReturnValue({ clinicId } as any)
    ;(getCurrentClinicUseCase as jest.Mock).mockResolvedValue({
      id: clinicId,
      name: 'Clínica do Coração',
      slug: 'clinica-do-coracao',
      isActive: true,
      themeId: null,
      address: null,
      createdAt: new Date(),
      updatedAt: new Date(),
    })

    const { result } = renderHook(() => useCurrentClinic(), { wrapper })

    await waitFor(() => expect(result.current.isSuccess).toBe(true))

    expect(getCurrentClinicUseCase).toHaveBeenCalledTimes(1)
    expect(result.current.data?.name).toBe('Clínica do Coração')
  })

  it('returns error state when use case rejects', async () => {
    const clinicId = 'clinic-uuid-1'
    mockUseAuthStore.mockReturnValue({ clinicId } as any)
    ;(getCurrentClinicUseCase as jest.Mock).mockRejectedValue(new Error('Unauthorized'))

    const { result } = renderHook(() => useCurrentClinic(), { wrapper })

    await waitFor(() => expect(result.current.isError).toBe(true))
  })
})
