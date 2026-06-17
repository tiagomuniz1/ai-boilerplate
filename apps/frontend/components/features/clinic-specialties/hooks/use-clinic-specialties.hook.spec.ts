jest.mock('../use-cases/list-clinic-specialties.use-case')

import React from 'react'
import { renderHook, waitFor } from '@testing-library/react'
import { QueryClientProvider } from '@tanstack/react-query'
import { createQueryClient } from '@/lib/react-query.config'
import { listClinicSpecialtiesUseCase } from '../use-cases/list-clinic-specialties.use-case'
import { useClinicSpecialties } from './use-clinic-specialties.hook'

const CLINIC_ID = 'clinic-uuid-1'

function wrapper({ children }: { children: React.ReactNode }) {
  const client = createQueryClient()
  client.setDefaultOptions({ queries: { retry: false } })
  return React.createElement(QueryClientProvider, { client }, children)
}

const makePaginated = () => ({
  data: [
    {
      id: 'link-uuid-1',
      clinicId: CLINIC_ID,
      specialtyId: 'specialty-uuid-1',
      name: 'Cardiologia',
      description: null,
      linkedAt: new Date('2024-01-15T10:00:00.000Z'),
    },
  ],
  total: 1,
  page: 1,
  limit: 20,
})

describe('useClinicSpecialties', () => {
  beforeEach(() => jest.clearAllMocks())

  it('returns paginated clinic specialties on success', async () => {
    const paginated = makePaginated()
    ;(listClinicSpecialtiesUseCase as jest.Mock).mockResolvedValue(paginated)

    const { result } = renderHook(() => useClinicSpecialties(CLINIC_ID), { wrapper })

    await waitFor(() => expect(result.current.isSuccess).toBe(true))

    expect(result.current.data).toEqual(paginated)
  })

  it('passes params to listClinicSpecialtiesUseCase', async () => {
    ;(listClinicSpecialtiesUseCase as jest.Mock).mockResolvedValue(makePaginated())

    const params = { search: 'Cardio', page: 1, limit: 10 }
    const { result } = renderHook(() => useClinicSpecialties(CLINIC_ID, params), { wrapper })

    await waitFor(() => expect(result.current.isSuccess).toBe(true))

    expect(listClinicSpecialtiesUseCase).toHaveBeenCalledWith(CLINIC_ID, params)
  })

  it('returns error state on failure', async () => {
    ;(listClinicSpecialtiesUseCase as jest.Mock).mockRejectedValue(new Error('Network error'))

    const { result } = renderHook(() => useClinicSpecialties(CLINIC_ID), { wrapper })

    await waitFor(() => expect(result.current.isError).toBe(true))
  })

  it('does not fetch when clinicId is empty', () => {
    const { result } = renderHook(() => useClinicSpecialties(''), { wrapper })

    expect(result.current.fetchStatus).toBe('idle')
    expect(listClinicSpecialtiesUseCase).not.toHaveBeenCalled()
  })
})
