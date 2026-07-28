jest.mock('@/components/features/professionals/hooks/use-professionals.hook')

import React from 'react'
import { renderHook } from '@testing-library/react'
import { QueryClientProvider } from '@tanstack/react-query'
import { createQueryClient } from '@/lib/react-query.config'
import { useProfessionals } from '@/components/features/professionals/hooks/use-professionals.hook'
import { useProfessionalByUserId } from './use-professional-by-user-id.hook'

function wrapper({ children }: { children: React.ReactNode }) {
  const client = createQueryClient()
  return React.createElement(QueryClientProvider, { client }, children)
}

const professionalForUserA = {
  id: 'prof-1',
  user: { id: 'user-a', fullName: 'Ana Nutri', email: 'ana@example.com' },
  registrations: [{ id: 'reg-1', councilType: 'CRN', number: '12345', state: 'SP', isPrimary: true }],
  specialties: [],
  bio: null,
  createdAt: new Date(),
  updatedAt: new Date(),
}

const professionalForUserB = {
  ...professionalForUserA,
  id: 'prof-2',
  user: { id: 'user-b', fullName: 'Bruno Fisio', email: 'bruno@example.com' },
}

describe('useProfessionalByUserId', () => {
  beforeEach(() => jest.clearAllMocks())

  it('returns the professional matching the given userId', () => {
    ;(useProfessionals as jest.Mock).mockReturnValue({
      data: [professionalForUserA, professionalForUserB],
      isPending: false,
      isError: false,
    })

    const { result } = renderHook(() => useProfessionalByUserId('user-b'), { wrapper })

    expect(result.current.professional).toEqual(professionalForUserB)
    expect(result.current.isPending).toBe(false)
    expect(result.current.isError).toBe(false)
  })

  it('returns undefined when no professional matches the userId', () => {
    ;(useProfessionals as jest.Mock).mockReturnValue({ data: [professionalForUserA], isPending: false, isError: false })

    const { result } = renderHook(() => useProfessionalByUserId('user-unknown'), { wrapper })

    expect(result.current.professional).toBeUndefined()
  })

  it('requests professionals with the lookup limit and enabled flag forwarded', () => {
    ;(useProfessionals as jest.Mock).mockReturnValue({ data: undefined, isPending: true, isError: false })

    renderHook(() => useProfessionalByUserId('user-a', { enabled: false }), { wrapper })

    expect(useProfessionals).toHaveBeenCalledWith({ limit: 100 }, { enabled: false })
  })

  it('suppresses pending/error state when disabled', () => {
    ;(useProfessionals as jest.Mock).mockReturnValue({ data: undefined, isPending: true, isError: true })

    const { result } = renderHook(() => useProfessionalByUserId('user-a', { enabled: false }), { wrapper })

    expect(result.current.isPending).toBe(false)
    expect(result.current.isError).toBe(false)
  })

  it('propagates pending/error state when enabled (default)', () => {
    ;(useProfessionals as jest.Mock).mockReturnValue({ data: undefined, isPending: true, isError: true })

    const { result } = renderHook(() => useProfessionalByUserId('user-a'), { wrapper })

    expect(result.current.isPending).toBe(true)
    expect(result.current.isError).toBe(true)
  })
})
