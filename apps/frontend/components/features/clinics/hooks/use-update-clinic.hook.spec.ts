jest.mock('../use-cases/update-clinic.use-case')
jest.mock('next/navigation', () => ({ useRouter: jest.fn() }))

import React from 'react'
import { renderHook, act, waitFor } from '@testing-library/react'
import { QueryClientProvider } from '@tanstack/react-query'
import { useRouter } from 'next/navigation'
import { createQueryClient } from '@/lib/react-query.config'
import { updateClinicUseCase } from '../use-cases/update-clinic.use-case'
import { useUpdateClinic } from './use-update-clinic.hook'

const mockPush = jest.fn()

function wrapper({ children }: { children: React.ReactNode }) {
  return React.createElement(QueryClientProvider, { client: createQueryClient() }, children)
}

const makeModel = () => ({
  id: 'uuid-1',
  name: 'Clínica Atualizada',
  slug: 'clinica-atualizada',
  isActive: false,
  createdAt: new Date(),
  updatedAt: new Date(),
})

describe('useUpdateClinic', () => {
  beforeEach(() => {
    jest.clearAllMocks()
    ;(useRouter as jest.Mock).mockReturnValue({ push: mockPush })
  })

  it('calls updateClinicUseCase with id and data', async () => {
    const payload = { id: 'uuid-1', data: { name: 'Clínica Atualizada', isActive: false } }
    ;(updateClinicUseCase as jest.Mock).mockResolvedValue(makeModel())

    const { result } = renderHook(() => useUpdateClinic(), { wrapper })

    act(() => result.current.mutate(payload))

    await waitFor(() => {
      expect(updateClinicUseCase).toHaveBeenCalledWith('uuid-1', payload.data)
    })
  })

  it('invalidates clinics cache and navigates to clinic details on success', async () => {
    ;(updateClinicUseCase as jest.Mock).mockResolvedValue(makeModel())

    const { result } = renderHook(() => useUpdateClinic(), { wrapper })

    act(() => result.current.mutate({ id: 'uuid-1', data: { isActive: false } }))

    await waitFor(() => {
      expect(mockPush).toHaveBeenCalledWith('/backoffice/clinics/uuid-1')
    })
  })

  it('does not navigate on error', async () => {
    const error = { status: 409, title: 'Conflict', detail: 'Slug already in use' }
    ;(updateClinicUseCase as jest.Mock).mockRejectedValue(error)

    const { result } = renderHook(() => useUpdateClinic(), { wrapper })

    act(() => result.current.mutate({ id: 'uuid-1', data: { name: 'Nova' } }))

    await waitFor(() => expect(result.current.isError).toBe(true))

    expect(mockPush).not.toHaveBeenCalled()
  })
})
