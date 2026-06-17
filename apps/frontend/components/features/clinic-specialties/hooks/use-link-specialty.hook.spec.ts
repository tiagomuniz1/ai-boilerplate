jest.mock('../use-cases/link-specialty.use-case')

import React from 'react'
import { renderHook, act, waitFor } from '@testing-library/react'
import { QueryClientProvider } from '@tanstack/react-query'
import { createQueryClient } from '@/lib/react-query.config'
import { linkSpecialtyUseCase } from '../use-cases/link-specialty.use-case'
import { useLinkSpecialty } from './use-link-specialty.hook'

const CLINIC_ID = 'clinic-uuid-1'
const SPECIALTY_ID = 'specialty-uuid-1'

function wrapper({ children }: { children: React.ReactNode }) {
  return React.createElement(QueryClientProvider, { client: createQueryClient() }, children)
}

const makeModel = () => ({
  id: 'link-uuid-1',
  clinicId: CLINIC_ID,
  specialtyId: SPECIALTY_ID,
  name: 'Cardiologia',
  description: null,
  linkedAt: new Date('2024-01-15T10:00:00.000Z'),
})

describe('useLinkSpecialty', () => {
  beforeEach(() => jest.clearAllMocks())

  it('calls linkSpecialtyUseCase with clinicId and specialtyId', async () => {
    const model = makeModel()
    ;(linkSpecialtyUseCase as jest.Mock).mockResolvedValue(model)

    const { result } = renderHook(() => useLinkSpecialty(CLINIC_ID), { wrapper })

    act(() => result.current.mutate(SPECIALTY_ID))

    await waitFor(() => {
      expect(linkSpecialtyUseCase).toHaveBeenCalledWith(CLINIC_ID, SPECIALTY_ID)
    })
  })

  it('returns data on success', async () => {
    const model = makeModel()
    ;(linkSpecialtyUseCase as jest.Mock).mockResolvedValue(model)

    const { result } = renderHook(() => useLinkSpecialty(CLINIC_ID), { wrapper })

    act(() => result.current.mutate(SPECIALTY_ID))

    await waitFor(() => expect(result.current.isSuccess).toBe(true))
    expect(result.current.data).toEqual(model)
  })

  it('returns error state on failure', async () => {
    const error = { status: 409, title: 'Conflict', detail: 'Already linked' }
    ;(linkSpecialtyUseCase as jest.Mock).mockRejectedValue(error)

    const { result } = renderHook(() => useLinkSpecialty(CLINIC_ID), { wrapper })

    act(() => result.current.mutate(SPECIALTY_ID))

    await waitFor(() => expect(result.current.isError).toBe(true))
  })
})
