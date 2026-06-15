jest.mock('../use-cases/upload-clinic-logo.use-case')

import React from 'react'
import { renderHook, act, waitFor } from '@testing-library/react'
import { QueryClientProvider } from '@tanstack/react-query'
import { createQueryClient } from '@/lib/react-query.config'
import { uploadClinicLogoUseCase } from '../use-cases/upload-clinic-logo.use-case'
import { useUploadClinicLogo } from './use-upload-clinic-logo.hook'

function wrapper({ children }: { children: React.ReactNode }) {
  return React.createElement(QueryClientProvider, { client: createQueryClient() }, children)
}

const makeModel = () => ({
  id: 'uuid-1',
  name: 'Clínica do Coração',
  slug: 'clinica-do-coracao',
  isActive: true,
  logoUrl: 'https://s3.amazonaws.com/clinics/uuid-1/logo.jpg',
  faviconUrl: null,
  themeId: null,
  address: null,
  createdAt: new Date(),
  updatedAt: new Date(),
})

describe('useUploadClinicLogo', () => {
  beforeEach(() => jest.clearAllMocks())

  it('calls uploadClinicLogoUseCase with the file', async () => {
    const file = new File(['img'], 'logo.jpg', { type: 'image/jpeg' })
    ;(uploadClinicLogoUseCase as jest.Mock).mockResolvedValue(makeModel())

    const { result } = renderHook(() => useUploadClinicLogo(), { wrapper })
    act(() => result.current.mutate(file))

    await waitFor(() => {
      expect(uploadClinicLogoUseCase).toHaveBeenCalledWith(file, undefined)
    })
  })

  it('passes clinicId to uploadClinicLogoUseCase when provided', async () => {
    const file = new File(['img'], 'logo.jpg', { type: 'image/jpeg' })
    ;(uploadClinicLogoUseCase as jest.Mock).mockResolvedValue(makeModel())

    const { result } = renderHook(() => useUploadClinicLogo('clinic-uuid-1'), { wrapper })
    act(() => result.current.mutate(file))

    await waitFor(() => {
      expect(uploadClinicLogoUseCase).toHaveBeenCalledWith(file, 'clinic-uuid-1')
    })
  })

  it('invalidates ["clinics", "me"] on success without clinicId', async () => {
    const file = new File(['img'], 'logo.jpg', { type: 'image/jpeg' })
    ;(uploadClinicLogoUseCase as jest.Mock).mockResolvedValue(makeModel())
    const queryClient = createQueryClient()
    const invalidate = jest.spyOn(queryClient, 'invalidateQueries')
    const customWrapper = ({ children }: { children: React.ReactNode }) =>
      React.createElement(QueryClientProvider, { client: queryClient }, children)

    const { result } = renderHook(() => useUploadClinicLogo(), { wrapper: customWrapper })
    act(() => result.current.mutate(file))

    await waitFor(() => expect(result.current.isSuccess).toBe(true))

    expect(invalidate).toHaveBeenCalledWith({ queryKey: ['clinics', 'me'] })
  })

  it('invalidates ["clinics", clinicId] on success with clinicId', async () => {
    const file = new File(['img'], 'logo.jpg', { type: 'image/jpeg' })
    ;(uploadClinicLogoUseCase as jest.Mock).mockResolvedValue(makeModel())
    const queryClient = createQueryClient()
    const invalidate = jest.spyOn(queryClient, 'invalidateQueries')
    const customWrapper = ({ children }: { children: React.ReactNode }) =>
      React.createElement(QueryClientProvider, { client: queryClient }, children)

    const { result } = renderHook(() => useUploadClinicLogo('clinic-uuid-1'), { wrapper: customWrapper })
    act(() => result.current.mutate(file))

    await waitFor(() => expect(result.current.isSuccess).toBe(true))

    expect(invalidate).toHaveBeenCalledWith({ queryKey: ['clinics', 'clinic-uuid-1'] })
  })

  it('does not invalidate queries on error', async () => {
    const file = new File(['img'], 'logo.jpg', { type: 'image/jpeg' })
    ;(uploadClinicLogoUseCase as jest.Mock).mockRejectedValue(new Error('fail'))
    const queryClient = createQueryClient()
    const invalidate = jest.spyOn(queryClient, 'invalidateQueries')
    const customWrapper = ({ children }: { children: React.ReactNode }) =>
      React.createElement(QueryClientProvider, { client: queryClient }, children)

    const { result } = renderHook(() => useUploadClinicLogo(), { wrapper: customWrapper })
    act(() => result.current.mutate(file))

    await waitFor(() => expect(result.current.isError).toBe(true))

    expect(invalidate).not.toHaveBeenCalled()
  })
})
