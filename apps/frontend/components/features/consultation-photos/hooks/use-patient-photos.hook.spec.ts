jest.mock('../use-cases/list-patient-photos.use-case')

import React from 'react'
import { renderHook, waitFor } from '@testing-library/react'
import { QueryClientProvider } from '@tanstack/react-query'
import { createQueryClient } from '@/lib/react-query.config'
import { listPatientPhotosUseCase } from '../use-cases/list-patient-photos.use-case'
import { usePatientPhotos } from './use-patient-photos.hook'

function wrapper({ children }: { children: React.ReactNode }) {
  const client = createQueryClient()
  client.setDefaultOptions({ queries: { retry: false } })
  return React.createElement(QueryClientProvider, { client }, children)
}

describe('usePatientPhotos', () => {
  beforeEach(() => jest.clearAllMocks())

  it('calls listPatientPhotosUseCase with patientId, page and limit', async () => {
    const paginated = { data: [{ id: 'photo-1' }], total: 1, page: 1, limit: 20 }
    ;(listPatientPhotosUseCase as jest.Mock).mockResolvedValue(paginated)

    const { result } = renderHook(() => usePatientPhotos('patient-uuid', 1, 20), { wrapper })

    await waitFor(() => expect(result.current.isSuccess).toBe(true))
    expect(listPatientPhotosUseCase).toHaveBeenCalledWith('patient-uuid', 1, 20)
    expect(result.current.data).toBe(paginated)
  })

  it('uses a query key scoped by patientId, page and limit', async () => {
    ;(listPatientPhotosUseCase as jest.Mock).mockResolvedValue({ data: [], total: 0, page: 2, limit: 10 })

    const { result } = renderHook(() => usePatientPhotos('patient-uuid', 2, 10), { wrapper })

    await waitFor(() => expect(result.current.isSuccess).toBe(true))
    expect(listPatientPhotosUseCase).toHaveBeenCalledWith('patient-uuid', 2, 10)
  })

  it('exposes error state when use-case throws', async () => {
    ;(listPatientPhotosUseCase as jest.Mock).mockRejectedValue(new Error('fetch error'))

    const { result } = renderHook(() => usePatientPhotos('patient-uuid', 1, 20), { wrapper })

    await waitFor(() => expect(result.current.isError).toBe(true))
  })
})
