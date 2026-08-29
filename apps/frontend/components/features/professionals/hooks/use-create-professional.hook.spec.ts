import { CouncilType } from '@app/shared'
jest.mock('../use-cases/create-professional.use-case')
jest.mock('next/navigation', () => ({ useRouter: jest.fn() }))
jest.mock('@/lib/slug-context', () => ({ useSlug: () => 'test-clinic', useBasePath: () => '/test-clinic' }))

import React from 'react'
import { renderHook, act, waitFor } from '@testing-library/react'
import { QueryClientProvider } from '@tanstack/react-query'
import { useRouter } from 'next/navigation'
import { createQueryClient } from '@/lib/react-query.config'
import { createProfessionalUseCase } from '../use-cases/create-professional.use-case'
import { useCreateProfessional } from './use-create-professional.hook'

const mockPush = jest.fn()

function wrapper({ children }: { children: React.ReactNode }) {
  return React.createElement(QueryClientProvider, { client: createQueryClient() }, children)
}

describe('useCreateProfessional', () => {
  const input = {
    userId: 'user-uuid-1',
    registrations: [{ id: 'crm-uuid-1', councilType: CouncilType.CRM, number: '12345', state: 'SP', isPrimary: true }],
    specialties: [{ specialtyId: 'spec-uuid-1' }],
  }
  const model = {
    id: 'uuid-1',
    user: { id: 'user-uuid-1', fullName: 'Dr. João', email: 'joao@example.com' },
    registrations: [{ id: 'crm-uuid-1', councilType: CouncilType.CRM, number: '12345', state: 'SP', isPrimary: true }],
    specialties: [{ id: 'spec-uuid-1', name: 'Cardiologia', registryNumber: null }],
    bio: null,
    createdAt: new Date(),
    updatedAt: new Date(),
  }

  beforeEach(() => {
    jest.clearAllMocks()
    ;(useRouter as jest.Mock).mockReturnValue({ push: mockPush })
  })

  it('calls createProfessionalUseCase with input', async () => {
    ;(createProfessionalUseCase as jest.Mock).mockResolvedValue(model)

    const { result } = renderHook(() => useCreateProfessional(), { wrapper })

    act(() => result.current.mutate(input))

    await waitFor(() => {
      expect(createProfessionalUseCase).toHaveBeenCalled()
      const [firstArg] = (createProfessionalUseCase as jest.Mock).mock.calls[0]
      expect(firstArg).toEqual(input)
    })
  })

  it('invalidates professionals cache and navigates to /professionals on success', async () => {
    ;(createProfessionalUseCase as jest.Mock).mockResolvedValue(model)

    const { result } = renderHook(() => useCreateProfessional(), { wrapper })

    act(() => result.current.mutate(input))

    await waitFor(() => {
      expect(mockPush).toHaveBeenCalledWith('/test-clinic/professionals')
    })
  })

  it('does not navigate on error', async () => {
    const error = { status: 409, title: 'Conflict', detail: 'CRM already in use' }
    ;(createProfessionalUseCase as jest.Mock).mockRejectedValue(error)

    const { result } = renderHook(() => useCreateProfessional(), { wrapper })

    act(() => result.current.mutate(input))

    await waitFor(() => expect(result.current.isError).toBe(true))

    expect(mockPush).not.toHaveBeenCalled()
  })
})
