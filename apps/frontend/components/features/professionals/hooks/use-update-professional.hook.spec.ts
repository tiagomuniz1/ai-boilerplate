jest.mock('../use-cases/update-professional.use-case')
jest.mock('next/navigation', () => ({ useRouter: jest.fn() }))
jest.mock('@/lib/slug-context', () => ({ useSlug: () => 'test-clinic', useBasePath: () => '/test-clinic' }))

import React from 'react'
import { renderHook, act, waitFor } from '@testing-library/react'
import { QueryClient, QueryClientProvider } from '@tanstack/react-query'
import { useRouter } from 'next/navigation'
import { createQueryClient } from '@/lib/react-query.config'
import { updateProfessionalUseCase } from '../use-cases/update-professional.use-case'
import { useUpdateProfessional } from './use-update-professional.hook'

const mockPush = jest.fn()

function makeWrapper(client: QueryClient) {
  return function wrapper({ children }: { children: React.ReactNode }) {
    return React.createElement(QueryClientProvider, { client }, children)
  }
}

const model = {
  id: 'uuid-1',
  user: { id: 'user-uuid-1', fullName: 'Dr. João', email: 'joao@example.com' },
  registrations: [{ id: 'crm-uuid-1', number: '12345', state: 'SP', isPrimary: true }],
  specialties: [{ id: 'spec-uuid-2', name: 'Neurologia', registryNumber: null }],
  bio: null,
  createdAt: new Date(),
  updatedAt: new Date(),
}

describe('useUpdateProfessional', () => {
  beforeEach(() => {
    jest.clearAllMocks()
    ;(useRouter as jest.Mock).mockReturnValue({ push: mockPush })
  })

  it('calls updateProfessionalUseCase with id and data', async () => {
    ;(updateProfessionalUseCase as jest.Mock).mockResolvedValue(model)

    const { result } = renderHook(() => useUpdateProfessional(), { wrapper: makeWrapper(createQueryClient()) })

    act(() => result.current.mutate({ id: 'uuid-1', data: { specialties: [{ specialtyId: 'spec-uuid-2' }] } }))

    await waitFor(() => {
      expect(updateProfessionalUseCase).toHaveBeenCalledWith('uuid-1', { specialties: [{ specialtyId: 'spec-uuid-2' }] })
    })
  })

  it('invalidates professionals and users queries on success', async () => {
    ;(updateProfessionalUseCase as jest.Mock).mockResolvedValue(model)

    const client = createQueryClient()
    const invalidate = jest.spyOn(client, 'invalidateQueries')

    const { result } = renderHook(() => useUpdateProfessional(), { wrapper: makeWrapper(client) })

    act(() => result.current.mutate({ id: 'uuid-1', data: { specialties: [{ specialtyId: 'spec-uuid-2' }] } }))

    await waitFor(() => expect(mockPush).toHaveBeenCalledWith('/test-clinic/professionals/uuid-1'))

    expect(invalidate).toHaveBeenCalledWith({ queryKey: ['professionals'] })
    expect(invalidate).toHaveBeenCalledWith({ queryKey: ['professionals', 'uuid-1'] })
    expect(invalidate).toHaveBeenCalledWith({ queryKey: ['users'] })
  })

  it('navigates to /professionals/:id on success', async () => {
    ;(updateProfessionalUseCase as jest.Mock).mockResolvedValue(model)

    const { result } = renderHook(() => useUpdateProfessional(), { wrapper: makeWrapper(createQueryClient()) })

    act(() => result.current.mutate({ id: 'uuid-1', data: { specialties: [{ specialtyId: 'spec-uuid-2' }] } }))

    await waitFor(() => {
      expect(mockPush).toHaveBeenCalledWith('/test-clinic/professionals/uuid-1')
    })
  })

  it('does not navigate on error', async () => {
    const error = { status: 409, title: 'Conflict', detail: 'CRM already in use' }
    ;(updateProfessionalUseCase as jest.Mock).mockRejectedValue(error)

    const { result } = renderHook(() => useUpdateProfessional(), { wrapper: makeWrapper(createQueryClient()) })

    act(() => result.current.mutate({ id: 'uuid-1', data: { specialties: [{ specialtyId: 'spec-uuid-2' }] } }))

    await waitFor(() => expect(result.current.isError).toBe(true))

    expect(mockPush).not.toHaveBeenCalled()
  })
})
