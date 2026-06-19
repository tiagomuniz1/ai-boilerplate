jest.mock('../use-cases/upload-clinic-logo-dark.use-case')

import React from 'react'
import { renderHook, act, waitFor } from '@testing-library/react'
import { QueryClientProvider } from '@tanstack/react-query'
import { createQueryClient } from '@/lib/react-query.config'
import { uploadClinicLogoDarkUseCase } from '../use-cases/upload-clinic-logo-dark.use-case'
import { useUploadClinicLogoDark } from './use-upload-clinic-logo-dark.hook'

const mockUpload = uploadClinicLogoDarkUseCase as jest.Mock

function wrapper({ children }: { children: React.ReactNode }) {
  return React.createElement(QueryClientProvider, { client: createQueryClient() }, children)
}

const file = new File(['img'], 'logo-dark.png', { type: 'image/png' })
const model = { id: 'uuid-1', name: 'Clínica' }

describe('useUploadClinicLogoDark', () => {
  beforeEach(() => jest.clearAllMocks())

  it('calls useCase with file and no clinicId, invalidates clinics:me', async () => {
    mockUpload.mockResolvedValue(model)

    const { result } = renderHook(() => useUploadClinicLogoDark(), { wrapper })

    act(() => result.current.mutate(file))

    await waitFor(() => expect(result.current.isSuccess).toBe(true))
    expect(mockUpload).toHaveBeenCalledWith(file, undefined)
  })

  it('calls useCase with file and clinicId, invalidates clinics:clinicId', async () => {
    mockUpload.mockResolvedValue(model)

    const { result } = renderHook(() => useUploadClinicLogoDark('clinic-uuid'), { wrapper })

    act(() => result.current.mutate(file))

    await waitFor(() => expect(result.current.isSuccess).toBe(true))
    expect(mockUpload).toHaveBeenCalledWith(file, 'clinic-uuid')
  })

  it('reports error state on failure', async () => {
    mockUpload.mockRejectedValue(new Error('Upload failed'))

    const { result } = renderHook(() => useUploadClinicLogoDark(), { wrapper })

    act(() => result.current.mutate(file))

    await waitFor(() => expect(result.current.isError).toBe(true))
  })
})
