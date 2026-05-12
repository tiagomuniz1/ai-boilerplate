jest.mock('../use-cases/list-doctors.use-case')

import React from 'react'
import { renderHook, waitFor } from '@testing-library/react'
import { QueryClientProvider } from '@tanstack/react-query'
import { createQueryClient } from '@/lib/react-query.config'
import { listDoctorsUseCase } from '../use-cases/list-doctors.use-case'
import { useDoctors } from './use-doctors.hook'

function wrapper({ children }: { children: React.ReactNode }) {
  const client = createQueryClient()
  client.setDefaultOptions({ queries: { retry: false } })
  return React.createElement(QueryClientProvider, { client }, children)
}

const makeModel = () => ({
  id: 'uuid-1',
  user: { id: 'user-uuid-1', fullName: 'Dr. João', email: 'joao@example.com' },
  crmNumber: '12345/SP',
  specialty: 'Cardiologia',
  bio: null,
  createdAt: new Date(),
  updatedAt: new Date(),
})

describe('useDoctors', () => {
  beforeEach(() => jest.clearAllMocks())

  it('returns doctors data on success', async () => {
    const model = makeModel()
    ;(listDoctorsUseCase as jest.Mock).mockResolvedValue([model])

    const { result } = renderHook(() => useDoctors(), { wrapper })

    await waitFor(() => expect(result.current.isSuccess).toBe(true))

    expect(result.current.data).toEqual([model])
  })

  it('passes params to listDoctorsUseCase', async () => {
    ;(listDoctorsUseCase as jest.Mock).mockResolvedValue([])

    const params = { search: 'Cardio', page: 1, limit: 20 }
    const { result } = renderHook(() => useDoctors(params), { wrapper })

    await waitFor(() => expect(result.current.isSuccess).toBe(true))

    expect(listDoctorsUseCase).toHaveBeenCalledWith(params)
  })

  it('returns error state on failure', async () => {
    ;(listDoctorsUseCase as jest.Mock).mockRejectedValue(new Error('Network error'))

    const { result } = renderHook(() => useDoctors(), { wrapper })

    await waitFor(() => expect(result.current.isError).toBe(true))
  })
})
