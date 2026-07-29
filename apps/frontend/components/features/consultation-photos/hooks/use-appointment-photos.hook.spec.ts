jest.mock('../use-cases/list-appointment-photos.use-case')

import React from 'react'
import { renderHook, waitFor } from '@testing-library/react'
import { QueryClientProvider } from '@tanstack/react-query'
import { createQueryClient } from '@/lib/react-query.config'
import { listAppointmentPhotosUseCase } from '../use-cases/list-appointment-photos.use-case'
import { useAppointmentPhotos } from './use-appointment-photos.hook'

function wrapper({ children }: { children: React.ReactNode }) {
  const client = createQueryClient()
  client.setDefaultOptions({ queries: { retry: false } })
  return React.createElement(QueryClientProvider, { client }, children)
}

describe('useAppointmentPhotos', () => {
  beforeEach(() => jest.clearAllMocks())

  it('calls listAppointmentPhotosUseCase with appointmentId and exposes data', async () => {
    const models = [{ id: 'photo-1' }]
    ;(listAppointmentPhotosUseCase as jest.Mock).mockResolvedValue(models)

    const { result } = renderHook(() => useAppointmentPhotos('appointment-uuid'), { wrapper })

    await waitFor(() => expect(result.current.isSuccess).toBe(true))
    expect(listAppointmentPhotosUseCase).toHaveBeenCalledWith('appointment-uuid')
    expect(result.current.data).toBe(models)
  })

  it('exposes error state when use-case throws', async () => {
    ;(listAppointmentPhotosUseCase as jest.Mock).mockRejectedValue(new Error('fetch error'))

    const { result } = renderHook(() => useAppointmentPhotos('appointment-uuid'), { wrapper })

    await waitFor(() => expect(result.current.isError).toBe(true))
  })
})
