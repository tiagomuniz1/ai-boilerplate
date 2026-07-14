jest.mock('../use-cases/create-doctor.use-case')
jest.mock('next/navigation', () => ({ useRouter: jest.fn() }))
jest.mock('@/lib/slug-context', () => ({ useSlug: () => 'test-clinic', useBasePath: () => '/test-clinic' }))

import React from 'react'
import { renderHook, act, waitFor } from '@testing-library/react'
import { QueryClientProvider } from '@tanstack/react-query'
import { useRouter } from 'next/navigation'
import { createQueryClient } from '@/lib/react-query.config'
import { createDoctorUseCase } from '../use-cases/create-doctor.use-case'
import { useCreateDoctor } from './use-create-doctor.hook'

const mockPush = jest.fn()

function wrapper({ children }: { children: React.ReactNode }) {
  return React.createElement(QueryClientProvider, { client: createQueryClient() }, children)
}

describe('useCreateDoctor', () => {
  const input = {
    userId: 'user-uuid-1',
    crms: [{ id: 'crm-uuid-1', number: '12345', state: 'SP', isPrimary: true }],
    specialties: [{ specialtyId: 'spec-uuid-1' }],
  }
  const model = {
    id: 'uuid-1',
    user: { id: 'user-uuid-1', fullName: 'Dr. João', email: 'joao@example.com' },
    crms: [{ id: 'crm-uuid-1', number: '12345', state: 'SP', isPrimary: true }],
    specialties: [{ id: 'spec-uuid-1', name: 'Cardiologia', rqe: null }],
    bio: null,
    createdAt: new Date(),
    updatedAt: new Date(),
  }

  beforeEach(() => {
    jest.clearAllMocks()
    ;(useRouter as jest.Mock).mockReturnValue({ push: mockPush })
  })

  it('calls createDoctorUseCase with input', async () => {
    ;(createDoctorUseCase as jest.Mock).mockResolvedValue(model)

    const { result } = renderHook(() => useCreateDoctor(), { wrapper })

    act(() => result.current.mutate(input))

    await waitFor(() => {
      expect(createDoctorUseCase).toHaveBeenCalled()
      const [firstArg] = (createDoctorUseCase as jest.Mock).mock.calls[0]
      expect(firstArg).toEqual(input)
    })
  })

  it('invalidates doctors cache and navigates to /doctors on success', async () => {
    ;(createDoctorUseCase as jest.Mock).mockResolvedValue(model)

    const { result } = renderHook(() => useCreateDoctor(), { wrapper })

    act(() => result.current.mutate(input))

    await waitFor(() => {
      expect(mockPush).toHaveBeenCalledWith('/test-clinic/doctors')
    })
  })

  it('does not navigate on error', async () => {
    const error = { status: 409, title: 'Conflict', detail: 'CRM already in use' }
    ;(createDoctorUseCase as jest.Mock).mockRejectedValue(error)

    const { result } = renderHook(() => useCreateDoctor(), { wrapper })

    act(() => result.current.mutate(input))

    await waitFor(() => expect(result.current.isError).toBe(true))

    expect(mockPush).not.toHaveBeenCalled()
  })
})
