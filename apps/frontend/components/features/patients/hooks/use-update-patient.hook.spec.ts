jest.mock('../use-cases/update-patient.use-case')
jest.mock('next/navigation', () => ({ useRouter: jest.fn() }))

import React from 'react'
import { renderHook, act, waitFor } from '@testing-library/react'
import { QueryClientProvider } from '@tanstack/react-query'
import { useRouter } from 'next/navigation'
import { PatientGender } from '@app/shared'
import { createQueryClient } from '@/lib/react-query.config'
import { updatePatientUseCase } from '../use-cases/update-patient.use-case'
import { useUpdatePatient } from './use-update-patient.hook'

const mockPush = jest.fn()

function wrapper({ children }: { children: React.ReactNode }) {
  return React.createElement(QueryClientProvider, { client: createQueryClient() }, children)
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

    const { result } = renderHook(() => useUpdatePatient(), { wrapper })

    act(() => result.current.mutate(payload))

    await waitFor(() => expect(updatePatientUseCase).toHaveBeenCalledWith('uuid-1', payload.data))
  })

  it('navigates to /patients/:id on success', async () => {
    ;(updatePatientUseCase as jest.Mock).mockResolvedValue(model)

    const { result } = renderHook(() => useUpdatePatient(), { wrapper })

    act(() => result.current.mutate(payload))

    await waitFor(() => {
      expect(mockPush).toHaveBeenCalledWith('/patients/uuid-1')
    })
  })

  it('does not navigate on error', async () => {
    const error = { status: 404, title: 'Not Found', detail: 'Patient not found' }
    ;(updatePatientUseCase as jest.Mock).mockRejectedValue(error)

    const { result } = renderHook(() => useUpdatePatient(), { wrapper })

    act(() => result.current.mutate(payload))

    await waitFor(() => expect(result.current.isError).toBe(true))

    expect(mockPush).not.toHaveBeenCalled()
  })
})
