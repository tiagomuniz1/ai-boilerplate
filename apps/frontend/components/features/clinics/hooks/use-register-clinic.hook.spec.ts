jest.mock('../use-cases/register-clinic.use-case')

import React from 'react'
import { renderHook, act, waitFor } from '@testing-library/react'
import { QueryClientProvider } from '@tanstack/react-query'
import { createQueryClient } from '@/lib/react-query.config'
import { registerClinicUseCase } from '../use-cases/register-clinic.use-case'
import { useRegisterClinic } from './use-register-clinic.hook'

function wrapper({ children }: { children: React.ReactNode }) {
  return React.createElement(QueryClientProvider, { client: createQueryClient() }, children)
}

const makeInput = () => ({
  clinicName: 'Clínica do Coração',
  slug: 'clinica-do-coracao',
  adminFullName: 'Admin Silva',
  adminEmail: 'admin@clinica.com',
  adminPassword: 'senha1234',
  adminPasswordConfirm: 'senha1234',
})

const makeResponse = () => ({
  clinic: { id: 'clinic-uuid-1', name: 'Clínica do Coração', slug: 'clinica-do-coracao' },
  admin: { id: 'admin-uuid-1', fullName: 'Admin Silva', email: 'admin@clinica.com' },
})

describe('useRegisterClinic', () => {
  beforeEach(() => jest.clearAllMocks())

  it('calls registerClinicUseCase without adminPasswordConfirm', async () => {
    const input = makeInput()
    ;(registerClinicUseCase as jest.Mock).mockResolvedValue(makeResponse())

    const { result } = renderHook(() => useRegisterClinic(), { wrapper })

    act(() => result.current.mutate(input))

    await waitFor(() => expect(result.current.isSuccess).toBe(true))

    const [calledWith] = (registerClinicUseCase as jest.Mock).mock.calls[0]
    expect(calledWith).not.toHaveProperty('adminPasswordConfirm')
    expect(calledWith).toEqual({
      clinicName: 'Clínica do Coração',
      slug: 'clinica-do-coracao',
      adminFullName: 'Admin Silva',
      adminEmail: 'admin@clinica.com',
      adminPassword: 'senha1234',
    })
  })

  it('returns response data on success', async () => {
    const response = makeResponse()
    ;(registerClinicUseCase as jest.Mock).mockResolvedValue(response)

    const { result } = renderHook(() => useRegisterClinic(), { wrapper })

    act(() => result.current.mutate(makeInput()))

    await waitFor(() => expect(result.current.isSuccess).toBe(true))

    expect(result.current.data).toEqual(response)
  })

  it('returns error state on failure', async () => {
    const error = { status: 409, title: 'Conflict', detail: 'Slug already in use' }
    ;(registerClinicUseCase as jest.Mock).mockRejectedValue(error)

    const { result } = renderHook(() => useRegisterClinic(), { wrapper })

    act(() => result.current.mutate(makeInput()))

    await waitFor(() => expect(result.current.isError).toBe(true))
  })
})
