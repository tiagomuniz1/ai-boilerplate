jest.mock('../use-cases/list-patient-medical-history.use-case')

import React from 'react'
import { renderHook, waitFor } from '@testing-library/react'
import { QueryClientProvider } from '@tanstack/react-query'
import { createQueryClient } from '@/lib/react-query.config'
import { listPatientMedicalHistoryUseCase } from '../use-cases/list-patient-medical-history.use-case'
import { usePatientMedicalHistory } from './use-patient-medical-history.hook'

function wrapper({ children }: { children: React.ReactNode }) {
  const client = createQueryClient()
  client.setDefaultOptions({ queries: { retry: false } })
  return React.createElement(QueryClientProvider, { client }, children)
}

const makePaginated = () => ({ data: [], total: 0, page: 1, limit: 20 })

describe('usePatientMedicalHistory', () => {
  beforeEach(() => jest.clearAllMocks())

  it('returns paginated history on success', async () => {
    const paginated = makePaginated()
    ;(listPatientMedicalHistoryUseCase as jest.Mock).mockResolvedValue(paginated)

    const { result } = renderHook(() => usePatientMedicalHistory('patient-uuid'), { wrapper })

    await waitFor(() => expect(result.current.isSuccess).toBe(true))
    expect(result.current.data).toBe(paginated)
    expect(listPatientMedicalHistoryUseCase).toHaveBeenCalledWith('patient-uuid', undefined)
  })

  it('passes params to use-case', async () => {
    ;(listPatientMedicalHistoryUseCase as jest.Mock).mockResolvedValue(makePaginated())

    const { result } = renderHook(() => usePatientMedicalHistory('patient-uuid', { page: 2, limit: 5 }), { wrapper })

    await waitFor(() => expect(result.current.isSuccess).toBe(true))
    expect(listPatientMedicalHistoryUseCase).toHaveBeenCalledWith('patient-uuid', { page: 2, limit: 5 })
  })

  it('does not fetch when patientId is empty', async () => {
    const { result } = renderHook(() => usePatientMedicalHistory(''), { wrapper })

    await waitFor(() => expect(result.current.fetchStatus).toBe('idle'))
    expect(listPatientMedicalHistoryUseCase).not.toHaveBeenCalled()
  })

  it('returns error state on failure', async () => {
    ;(listPatientMedicalHistoryUseCase as jest.Mock).mockRejectedValue(new Error('error'))

    const { result } = renderHook(() => usePatientMedicalHistory('patient-uuid'), { wrapper })

    await waitFor(() => expect(result.current.isError).toBe(true))
  })
})
