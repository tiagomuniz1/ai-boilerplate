jest.mock('../use-cases/get-reassign-candidates.use-case')

import React from 'react'
import { renderHook, waitFor } from '@testing-library/react'
import { QueryClientProvider } from '@tanstack/react-query'
import { createQueryClient } from '@/lib/react-query.config'
import { getReassignCandidatesUseCase } from '../use-cases/get-reassign-candidates.use-case'
import { useReassignCandidates } from './use-reassign-candidates.hook'

function wrapper({ children }: { children: React.ReactNode }) {
  const client = createQueryClient()
  client.setDefaultOptions({ queries: { retry: false } })
  return React.createElement(QueryClientProvider, { client }, children)
}

describe('useReassignCandidates', () => {
  beforeEach(() => jest.clearAllMocks())

  it('fetches candidates when enabled', async () => {
    const candidates = [{ professionalId: 'd1', professionalName: 'Dr. Ana', specialtyName: 'Cardiologia' }]
    ;(getReassignCandidatesUseCase as jest.Mock).mockResolvedValue(candidates)

    const { result } = renderHook(() => useReassignCandidates('apt-1', true), { wrapper })

    await waitFor(() => expect(result.current.isSuccess).toBe(true))
    expect(result.current.data).toBe(candidates)
    expect(getReassignCandidatesUseCase).toHaveBeenCalledWith('apt-1')
  })

  it('does not fetch when disabled', () => {
    renderHook(() => useReassignCandidates('apt-1', false), { wrapper })
    expect(getReassignCandidatesUseCase).not.toHaveBeenCalled()
  })

  it('does not fetch when id is empty', () => {
    renderHook(() => useReassignCandidates('', true), { wrapper })
    expect(getReassignCandidatesUseCase).not.toHaveBeenCalled()
  })
})
