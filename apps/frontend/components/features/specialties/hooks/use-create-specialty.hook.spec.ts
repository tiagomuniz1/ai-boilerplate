jest.mock('../use-cases/create-specialty.use-case')
jest.mock('next/navigation', () => ({ useRouter: jest.fn() }))
jest.mock('@/lib/slug-context', () => ({ useSlug: () => 'test-clinic', useBasePath: () => '/test-clinic' }))

import React from 'react'
import { renderHook, act, waitFor } from '@testing-library/react'
import { QueryClientProvider } from '@tanstack/react-query'
import { useRouter } from 'next/navigation'
import { createQueryClient } from '@/lib/react-query.config'
import { createSpecialtyUseCase } from '../use-cases/create-specialty.use-case'
import { useCreateSpecialty } from './use-create-specialty.hook'

const mockPush = jest.fn()

function wrapper({ children }: { children: React.ReactNode }) {
  return React.createElement(QueryClientProvider, { client: createQueryClient() }, children)
}

describe('useCreateSpecialty', () => {
  const input = { name: 'Cardiologia' }
  const model = { id: 'uuid-1', name: 'Cardiologia', description: null, createdAt: new Date(), updatedAt: new Date() }

  beforeEach(() => {
    jest.clearAllMocks()
    ;(useRouter as jest.Mock).mockReturnValue({ push: mockPush })
  })

  it('calls createSpecialtyUseCase with input', async () => {
    ;(createSpecialtyUseCase as jest.Mock).mockResolvedValue(model)

    const { result } = renderHook(() => useCreateSpecialty(), { wrapper })

    act(() => result.current.mutate(input))

    await waitFor(() => {
      expect(createSpecialtyUseCase).toHaveBeenCalled()
      const [firstArg] = (createSpecialtyUseCase as jest.Mock).mock.calls[0]
      expect(firstArg).toEqual(input)
    })
  })

  it('invalidates specialties cache and navigates to /specialties on success', async () => {
    ;(createSpecialtyUseCase as jest.Mock).mockResolvedValue(model)

    const { result } = renderHook(() => useCreateSpecialty(), { wrapper })

    act(() => result.current.mutate(input))

    await waitFor(() => {
      expect(mockPush).toHaveBeenCalledWith('/test-clinic/specialties')
    })
  })

  it('does not navigate on error', async () => {
    const error = { status: 409, title: 'Conflict', detail: 'Specialty name already in use' }
    ;(createSpecialtyUseCase as jest.Mock).mockRejectedValue(error)

    const { result } = renderHook(() => useCreateSpecialty(), { wrapper })

    act(() => result.current.mutate(input))

    await waitFor(() => expect(result.current.isError).toBe(true))

    expect(mockPush).not.toHaveBeenCalled()
  })
})
