jest.mock('../use-cases/get-clinic-by-slug.use-case')

import React from 'react'
import { renderHook, waitFor } from '@testing-library/react'
import { QueryClientProvider } from '@tanstack/react-query'
import { createQueryClient } from '@/lib/react-query.config'
import { getClinicBySlugUseCase } from '../use-cases/get-clinic-by-slug.use-case'
import { useCurrentClinic } from './use-current-clinic.hook'

const mockUseSlug = jest.fn<string, []>()

jest.mock('@/lib/slug-context', () => ({
  useSlug: () => mockUseSlug(),
}))

function wrapper({ children }: { children: React.ReactNode }) {
  const client = createQueryClient()
  client.setDefaultOptions({ queries: { retry: false } })
  return React.createElement(QueryClientProvider, { client }, children)
}

describe('useCurrentClinic', () => {
  beforeEach(() => jest.clearAllMocks())

  it('is disabled when slug is empty', () => {
    mockUseSlug.mockReturnValue('')
    const { result } = renderHook(() => useCurrentClinic(), { wrapper })
    expect(result.current.fetchStatus).toBe('idle')
    expect(getClinicBySlugUseCase).not.toHaveBeenCalled()
  })

  it('is disabled when slug is "backoffice"', () => {
    mockUseSlug.mockReturnValue('backoffice')
    const { result } = renderHook(() => useCurrentClinic(), { wrapper })
    expect(result.current.fetchStatus).toBe('idle')
    expect(getClinicBySlugUseCase).not.toHaveBeenCalled()
  })

  it('fetches clinic when slug is a valid clinic slug', async () => {
    mockUseSlug.mockReturnValue('clinica-do-coracao')
    ;(getClinicBySlugUseCase as jest.Mock).mockResolvedValue({
      id: 'clinic-uuid-1',
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

    expect(getClinicBySlugUseCase).toHaveBeenCalledWith('clinica-do-coracao')
    expect(result.current.data?.name).toBe('Clínica do Coração')
  })

  it('uses slug-based query key', async () => {
    const slug = 'clinica-xyz'
    mockUseSlug.mockReturnValue(slug)
    ;(getClinicBySlugUseCase as jest.Mock).mockResolvedValue({
      id: 'uuid-1', name: 'Clínica XYZ', slug, isActive: true,
      themeId: null, address: null, createdAt: new Date(), updatedAt: new Date(),
    })

    const { result } = renderHook(() => useCurrentClinic(), { wrapper })
    await waitFor(() => expect(result.current.isSuccess).toBe(true))

    expect(getClinicBySlugUseCase).toHaveBeenCalledWith(slug)
  })

  it('returns error state when use case rejects', async () => {
    mockUseSlug.mockReturnValue('clinica-do-coracao')
    ;(getClinicBySlugUseCase as jest.Mock).mockRejectedValue(new Error('Not Found'))

    const { result } = renderHook(() => useCurrentClinic(), { wrapper })

    await waitFor(() => expect(result.current.isError).toBe(true))
  })
})
