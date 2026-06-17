jest.mock('../use-cases/unlink-specialty.use-case')

import React from 'react'
import { renderHook, act, waitFor } from '@testing-library/react'
import { QueryClientProvider } from '@tanstack/react-query'
import { createQueryClient } from '@/lib/react-query.config'
import { unlinkSpecialtyUseCase } from '../use-cases/unlink-specialty.use-case'
import { useUnlinkSpecialty } from './use-unlink-specialty.hook'

const CLINIC_ID = 'clinic-uuid-1'
const SPECIALTY_ID = 'specialty-uuid-1'

function wrapper({ children }: { children: React.ReactNode }) {
  return React.createElement(QueryClientProvider, { client: createQueryClient() }, children)
}

describe('useUnlinkSpecialty', () => {
  beforeEach(() => jest.clearAllMocks())

  it('calls unlinkSpecialtyUseCase with clinicId and specialtyId', async () => {
    ;(unlinkSpecialtyUseCase as jest.Mock).mockResolvedValue(undefined)

    const { result } = renderHook(() => useUnlinkSpecialty(CLINIC_ID), { wrapper })

    act(() => result.current.mutate(SPECIALTY_ID))

    await waitFor(() => {
      expect(unlinkSpecialtyUseCase).toHaveBeenCalledWith(CLINIC_ID, SPECIALTY_ID)
    })
  })

  it('returns error state on failure', async () => {
    const error = { status: 404, title: 'Not Found', detail: 'Link not found' }
    ;(unlinkSpecialtyUseCase as jest.Mock).mockRejectedValue(error)

    const { result } = renderHook(() => useUnlinkSpecialty(CLINIC_ID), { wrapper })

    act(() => result.current.mutate(SPECIALTY_ID))

    await waitFor(() => expect(result.current.isError).toBe(true))
  })
})
