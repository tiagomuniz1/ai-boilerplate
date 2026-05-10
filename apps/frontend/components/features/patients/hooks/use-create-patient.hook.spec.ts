jest.mock('../use-cases/create-patient.use-case')
jest.mock('next/navigation', () => ({ useRouter: jest.fn() }))

import React from 'react'
import { renderHook, act, waitFor } from '@testing-library/react'
import { QueryClientProvider } from '@tanstack/react-query'
import { useRouter } from 'next/navigation'
import { PatientGender } from '@app/shared'
import { createQueryClient } from '@/lib/react-query.config'
import { createPatientUseCase } from '../use-cases/create-patient.use-case'
import { useCreatePatient } from './use-create-patient.hook'

const mockPush = jest.fn()

function wrapper({ children }: { children: React.ReactNode }) {
  return React.createElement(QueryClientProvider, { client: createQueryClient() }, children)
}

describe('useCreatePatient', () => {
  const input = {
    fullName: 'João Silva',
    email: 'joao@example.com',
    phoneNumber: '(11) 99999-9999',
    birthDate: '1990-05-15',
    documentNumber: '12345678901',
    gender: PatientGender.MALE,
  }
  const model = { id: 'uuid-1', ...input, birthDate: new Date('1990-05-15'), createdAt: new Date(), updatedAt: new Date() }

  beforeEach(() => {
    jest.clearAllMocks()
    ;(useRouter as jest.Mock).mockReturnValue({ push: mockPush })
  })

  it('calls createPatientUseCase with input', async () => {
    ;(createPatientUseCase as jest.Mock).mockResolvedValue(model)

    const { result } = renderHook(() => useCreatePatient(), { wrapper })

    act(() => result.current.mutate(input))

    await waitFor(() => {
      expect(createPatientUseCase).toHaveBeenCalled()
      const [firstArg] = (createPatientUseCase as jest.Mock).mock.calls[0]
      expect(firstArg).toEqual(input)
    })
  })

  it('invalidates patients cache and navigates to /patients on success', async () => {
    ;(createPatientUseCase as jest.Mock).mockResolvedValue(model)

    const { result } = renderHook(() => useCreatePatient(), { wrapper })

    act(() => result.current.mutate(input))

    await waitFor(() => {
      expect(mockPush).toHaveBeenCalledWith('/patients')
    })
  })

  it('does not navigate on error', async () => {
    const error = { status: 422, title: 'Unprocessable Entity', detail: 'Validation failed' }
    ;(createPatientUseCase as jest.Mock).mockRejectedValue(error)

    const { result } = renderHook(() => useCreatePatient(), { wrapper })

    act(() => result.current.mutate(input))

    await waitFor(() => expect(result.current.isError).toBe(true))

    expect(mockPush).not.toHaveBeenCalled()
  })
})
