jest.mock('../use-cases/update-doctor.use-case')
jest.mock('next/navigation', () => ({ useRouter: jest.fn() }))

import React from 'react'
import { renderHook, act, waitFor } from '@testing-library/react'
import { QueryClientProvider } from '@tanstack/react-query'
import { useRouter } from 'next/navigation'
import { createQueryClient } from '@/lib/react-query.config'
import { updateDoctorUseCase } from '../use-cases/update-doctor.use-case'
import { useUpdateDoctor } from './use-update-doctor.hook'

const mockPush = jest.fn()

function wrapper({ children }: { children: React.ReactNode }) {
  return React.createElement(QueryClientProvider, { client: createQueryClient() }, children)
}

const model = {
  id: 'uuid-1',
  user: { id: 'user-uuid-1', fullName: 'Dr. João', email: 'joao@example.com' },
  crmNumber: '12345/SP',
  specialty: 'Neurologia',
  bio: null,
  createdAt: new Date(),
  updatedAt: new Date(),
}

describe('useUpdateDoctor', () => {
  beforeEach(() => {
    jest.clearAllMocks()
    ;(useRouter as jest.Mock).mockReturnValue({ push: mockPush })
  })

  it('calls updateDoctorUseCase with id and data', async () => {
    ;(updateDoctorUseCase as jest.Mock).mockResolvedValue(model)

    const { result } = renderHook(() => useUpdateDoctor(), { wrapper })

    act(() => result.current.mutate({ id: 'uuid-1', data: { specialty: 'Neurologia' } }))

    await waitFor(() => {
      expect(updateDoctorUseCase).toHaveBeenCalledWith('uuid-1', { specialty: 'Neurologia' })
    })
  })

  it('navigates to /doctors/:id on success', async () => {
    ;(updateDoctorUseCase as jest.Mock).mockResolvedValue(model)

    const { result } = renderHook(() => useUpdateDoctor(), { wrapper })

    act(() => result.current.mutate({ id: 'uuid-1', data: { specialty: 'Neurologia' } }))

    await waitFor(() => {
      expect(mockPush).toHaveBeenCalledWith('/doctors/uuid-1')
    })
  })

  it('does not navigate on error', async () => {
    const error = { status: 409, title: 'Conflict', detail: 'CRM already in use' }
    ;(updateDoctorUseCase as jest.Mock).mockRejectedValue(error)

    const { result } = renderHook(() => useUpdateDoctor(), { wrapper })

    act(() => result.current.mutate({ id: 'uuid-1', data: { specialty: 'Neurologia' } }))

    await waitFor(() => expect(result.current.isError).toBe(true))

    expect(mockPush).not.toHaveBeenCalled()
  })
})
