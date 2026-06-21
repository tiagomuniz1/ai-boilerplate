jest.mock('next/navigation', () => ({ useRouter: jest.fn() }))
jest.mock('@/lib/slug-context', () => ({ useSlug: jest.fn(() => 'clinic-slug') }))
jest.mock('../use-cases/create-template.use-case')

import React from 'react'
import { renderHook, waitFor, act } from '@testing-library/react'
import { QueryClientProvider } from '@tanstack/react-query'
import { useRouter } from 'next/navigation'
import { MedicalRecordFieldType } from '@app/shared'
import { createQueryClient } from '@/lib/react-query.config'
import { createTemplateUseCase } from '../use-cases/create-template.use-case'
import { useCreateTemplate } from './use-create-template.hook'

const mockPush = jest.fn()

function wrapper({ children }: { children: React.ReactNode }) {
  const client = createQueryClient()
  client.setDefaultOptions({ mutations: { retry: false } })
  return React.createElement(QueryClientProvider, { client }, children)
}

const makeModel = () => ({
  id: 'uuid-1',
  specialtyId: 'spec-uuid',
  specialtyName: 'Cardio',
  name: 'Anamnese',
  fields: [],
  isActive: true,
  createdAt: new Date(),
  updatedAt: new Date(),
})

const makeInput = () => ({
  specialtyId: 'spec-uuid',
  name: 'Anamnese',
  fields: [{ label: 'Sintoma', type: MedicalRecordFieldType.TEXT, required: true, order: 0, options: [], placeholder: '', helpText: '', canonical: false, canonicalKey: '' }],
})

describe('useCreateTemplate', () => {
  beforeEach(() => {
    jest.clearAllMocks()
    ;(useRouter as jest.Mock).mockReturnValue({ push: mockPush })
  })

  it('calls createTemplateUseCase with input', async () => {
    ;(createTemplateUseCase as jest.Mock).mockResolvedValue(makeModel())
    const { result } = renderHook(() => useCreateTemplate(), { wrapper })

    const input = makeInput()
    await act(async () => { result.current.mutate(input) })
    await waitFor(() => expect(result.current.isSuccess).toBe(true))

    expect((createTemplateUseCase as jest.Mock).mock.calls[0][0]).toEqual(input)
  })

  it('redirects to templates list on success', async () => {
    ;(createTemplateUseCase as jest.Mock).mockResolvedValue(makeModel())
    const { result } = renderHook(() => useCreateTemplate(), { wrapper })

    await act(async () => { result.current.mutate(makeInput()) })
    await waitFor(() => expect(result.current.isSuccess).toBe(true))

    expect(mockPush).toHaveBeenCalledWith('/clinic-slug/medical-record-templates')
  })

  it('returns error state on failure', async () => {
    ;(createTemplateUseCase as jest.Mock).mockRejectedValue({ status: 422 })
    const { result } = renderHook(() => useCreateTemplate(), { wrapper })

    await act(async () => { result.current.mutate(makeInput()) })
    await waitFor(() => expect(result.current.isError).toBe(true))
  })
})
