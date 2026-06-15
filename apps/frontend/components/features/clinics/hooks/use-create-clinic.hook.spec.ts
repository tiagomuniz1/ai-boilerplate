jest.mock('../use-cases/create-clinic.use-case')
jest.mock('next/navigation', () => ({ useRouter: jest.fn() }))
jest.mock('@/lib/slug-context', () => ({ useSlug: () => 'test-clinic' }))

import React from 'react'
import { renderHook, act, waitFor } from '@testing-library/react'
import { QueryClientProvider } from '@tanstack/react-query'
import { useRouter } from 'next/navigation'
import { createQueryClient } from '@/lib/react-query.config'
import { createClinicUseCase } from '../use-cases/create-clinic.use-case'
import { useCreateClinic } from './use-create-clinic.hook'

const mockPush = jest.fn()

function wrapper({ children }: { children: React.ReactNode }) {
  return React.createElement(QueryClientProvider, { client: createQueryClient() }, children)
}

const makeModel = () => ({
  id: 'uuid-1',
  name: 'Clínica do Coração',
  slug: 'clinica-do-coracao',
  isActive: true,
  createdAt: new Date(),
  updatedAt: new Date(),
})

describe('useCreateClinic', () => {
  beforeEach(() => {
    jest.clearAllMocks()
    ;(useRouter as jest.Mock).mockReturnValue({ push: mockPush })
  })

  it('calls createClinicUseCase with input', async () => {
    const input = { name: 'Clínica do Coração', slug: 'clinica-do-coracao' }
    ;(createClinicUseCase as jest.Mock).mockResolvedValue(makeModel())

    const { result } = renderHook(() => useCreateClinic(), { wrapper })

    act(() => result.current.mutate(input))

    await waitFor(() => {
      expect(createClinicUseCase).toHaveBeenCalled()
      const [firstArg] = (createClinicUseCase as jest.Mock).mock.calls[0]
      expect(firstArg).toEqual(input)
    })
  })

  it('invalidates clinics cache and navigates to /clinics on success', async () => {
    ;(createClinicUseCase as jest.Mock).mockResolvedValue(makeModel())

    const { result } = renderHook(() => useCreateClinic(), { wrapper })

    act(() => result.current.mutate({ name: 'Clínica do Coração' }))

    await waitFor(() => {
      expect(mockPush).toHaveBeenCalledWith('/test-clinic/clinics')
    })
  })

  it('does not navigate on error', async () => {
    const error = { status: 409, title: 'Conflict', detail: 'Slug already in use' }
    ;(createClinicUseCase as jest.Mock).mockRejectedValue(error)

    const { result } = renderHook(() => useCreateClinic(), { wrapper })

    act(() => result.current.mutate({ name: 'Clínica do Coração' }))

    await waitFor(() => expect(result.current.isError).toBe(true))

    expect(mockPush).not.toHaveBeenCalled()
  })
})
