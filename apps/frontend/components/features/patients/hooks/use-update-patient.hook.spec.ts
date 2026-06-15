jest.mock('../use-cases/update-patient.use-case')
jest.mock('next/navigation', () => ({ useRouter: jest.fn() }))
jest.mock('@/lib/slug-context', () => ({ useSlug: () => 'test-clinic' }))

import React from 'react'
import { renderHook, act, waitFor } from '@testing-library/react'
import { QueryClient, QueryClientProvider } from '@tanstack/react-query'
import { useRouter } from 'next/navigation'
import { PatientGender } from '@app/shared'
import { createQueryClient } from '@/lib/react-query.config'
import { updatePatientUseCase } from '../use-cases/update-patient.use-case'
import { useUpdatePatient } from './use-update-patient.hook'

const mockPush = jest.fn()

function makeWrapper(client: QueryClient) {
  return function wrapper({ children }: { children: React.ReactNode }) {
    return React.createElement(QueryClientProvider, { client }, children)
  }
}

describe('useUpdatePatient', () => {
  const payload = { id: 'uuid-1', data: { fullName: 'João Atualizado', gender: PatientGender.MALE } }
  const model = { id: 'uuid-1', fullName: 'João Atualizado', email: 'joao@example.com', phoneNumber: '(11) 99999-9999', birthDate: new Date('1990-05-15'), documentNumber: '12345678901', gender: PatientGender.MALE, createdAt: new Date(), updatedAt: new Date() }

  beforeEach(() => {
    jest.clearAllMocks()
    ;(useRouter as jest.Mock).mockReturnValue({ push: mockPush })
  })

  it('calls updatePatientUseCase with id and data', async () => {
    ;(updatePatientUseCase as jest.Mock).mockResolvedValue(model)

    const { result } = renderHook(() => useUpdatePatient(), { wrapper: makeWrapper(createQueryClient()) })

    act(() => result.current.mutate(payload))

    await waitFor(() => expect(updatePatientUseCase).toHaveBeenCalledWith('uuid-1', payload.data))
  })

  it('invalidates patients and users queries on success', async () => {
    ;(updatePatientUseCase as jest.Mock).mockResolvedValue(model)

    const client = createQueryClient()
    const invalidate = jest.spyOn(client, 'invalidateQueries')

    const { result } = renderHook(() => useUpdatePatient(), { wrapper: makeWrapper(client) })

    act(() => result.current.mutate(payload))

    await waitFor(() => expect(mockPush).toHaveBeenCalledWith('/test-clinic/patients/uuid-1'))

    expect(invalidate).toHaveBeenCalledWith({ queryKey: ['patients'] })
    expect(invalidate).toHaveBeenCalledWith({ queryKey: ['patients', 'uuid-1'] })
    expect(invalidate).toHaveBeenCalledWith({ queryKey: ['users'] })
  })

  it('navigates to /patients/:id on success', async () => {
    ;(updatePatientUseCase as jest.Mock).mockResolvedValue(model)

    const { result } = renderHook(() => useUpdatePatient(), { wrapper: makeWrapper(createQueryClient()) })

    act(() => result.current.mutate(payload))

    await waitFor(() => {
      expect(mockPush).toHaveBeenCalledWith('/test-clinic/patients/uuid-1')
    })
  })

  it('does not navigate on error', async () => {
    const error = { status: 404, title: 'Not Found', detail: 'Patient not found' }
    ;(updatePatientUseCase as jest.Mock).mockRejectedValue(error)

    const { result } = renderHook(() => useUpdatePatient(), { wrapper: makeWrapper(createQueryClient()) })

    act(() => result.current.mutate(payload))

    await waitFor(() => expect(result.current.isError).toBe(true))

    expect(mockPush).not.toHaveBeenCalled()
  })
})
