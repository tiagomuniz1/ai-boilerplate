jest.mock('../use-cases/update-specialty.use-case')
jest.mock('next/navigation', () => ({ useRouter: jest.fn() }))
jest.mock('@/lib/slug-context', () => ({ useSlug: () => 'test-clinic' }))

import React from 'react'
import { renderHook, act, waitFor } from '@testing-library/react'
import { QueryClientProvider } from '@tanstack/react-query'
import { useRouter } from 'next/navigation'
import { createQueryClient } from '@/lib/react-query.config'
import { updateSpecialtyUseCase } from '../use-cases/update-specialty.use-case'
import { useUpdateSpecialty } from './use-update-specialty.hook'

const mockPush = jest.fn()

function wrapper({ children }: { children: React.ReactNode }) {
  return React.createElement(QueryClientProvider, { client: createQueryClient() }, children)
}

const model = { id: 'uuid-1', name: 'Neurologia', description: null, createdAt: new Date(), updatedAt: new Date() }

describe('useUpdateSpecialty', () => {
  beforeEach(() => {
    jest.clearAllMocks()
    ;(useRouter as jest.Mock).mockReturnValue({ push: mockPush })
  })

  it('calls updateSpecialtyUseCase with id and data', async () => {
    ;(updateSpecialtyUseCase as jest.Mock).mockResolvedValue(model)

    const { result } = renderHook(() => useUpdateSpecialty(), { wrapper })

    act(() => result.current.mutate({ id: 'uuid-1', data: { name: 'Neurologia' } }))

    await waitFor(() => {
      expect(updateSpecialtyUseCase).toHaveBeenCalledWith('uuid-1', { name: 'Neurologia' })
    })
  })

  it('navigates to /specialties/:id on success', async () => {
    ;(updateSpecialtyUseCase as jest.Mock).mockResolvedValue(model)

    const { result } = renderHook(() => useUpdateSpecialty(), { wrapper })

    act(() => result.current.mutate({ id: 'uuid-1', data: { name: 'Neurologia' } }))

    await waitFor(() => {
      expect(mockPush).toHaveBeenCalledWith('/test-clinic/specialties/uuid-1')
    })
  })

  it('does not navigate on error', async () => {
    const error = { status: 409, title: 'Conflict', detail: 'Specialty name already in use' }
    ;(updateSpecialtyUseCase as jest.Mock).mockRejectedValue(error)

    const { result } = renderHook(() => useUpdateSpecialty(), { wrapper })

    act(() => result.current.mutate({ id: 'uuid-1', data: { name: 'Neurologia' } }))

    await waitFor(() => expect(result.current.isError).toBe(true))

    expect(mockPush).not.toHaveBeenCalled()
  })
})
