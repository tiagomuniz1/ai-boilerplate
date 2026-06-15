jest.mock('../use-cases/upload-clinic-favicon.use-case')

import React from 'react'
import { renderHook, act, waitFor } from '@testing-library/react'
import { QueryClientProvider } from '@tanstack/react-query'
import { createQueryClient } from '@/lib/react-query.config'
import { uploadClinicFaviconUseCase } from '../use-cases/upload-clinic-favicon.use-case'
import { useUploadClinicFavicon } from './use-upload-clinic-favicon.hook'

function wrapper({ children }: { children: React.ReactNode }) {
  return React.createElement(QueryClientProvider, { client: createQueryClient() }, children)
}

const makeModel = () => ({
  id: 'uuid-1',
  name: 'Clínica do Coração',
  slug: 'clinica-do-coracao',
  isActive: true,
  logoUrl: null,
  faviconUrl: 'https://s3.amazonaws.com/clinics/uuid-1/favicon.ico',
  themeId: null,
  address: null,
  createdAt: new Date(),
  updatedAt: new Date(),
})

describe('useUploadClinicFavicon', () => {
  beforeEach(() => jest.clearAllMocks())

  it('calls uploadClinicFaviconUseCase with the file', async () => {
    const file = new File(['ico'], 'favicon.ico', { type: 'image/x-icon' })
    ;(uploadClinicFaviconUseCase as jest.Mock).mockResolvedValue(makeModel())

    const { result } = renderHook(() => useUploadClinicFavicon(), { wrapper })
    act(() => result.current.mutate(file))

    await waitFor(() => {
      expect(uploadClinicFaviconUseCase).toHaveBeenCalledWith(file, undefined)
    })
  })

  it('passes clinicId to uploadClinicFaviconUseCase when provided', async () => {
    const file = new File(['ico'], 'favicon.ico', { type: 'image/x-icon' })
    ;(uploadClinicFaviconUseCase as jest.Mock).mockResolvedValue(makeModel())

    const { result } = renderHook(() => useUploadClinicFavicon('clinic-uuid-1'), { wrapper })
    act(() => result.current.mutate(file))

    await waitFor(() => {
      expect(uploadClinicFaviconUseCase).toHaveBeenCalledWith(file, 'clinic-uuid-1')
    })
  })

  it('invalidates ["clinics", "me"] on success without clinicId', async () => {
    const file = new File(['ico'], 'favicon.ico', { type: 'image/x-icon' })
    ;(uploadClinicFaviconUseCase as jest.Mock).mockResolvedValue(makeModel())
    const queryClient = createQueryClient()
    const invalidate = jest.spyOn(queryClient, 'invalidateQueries')
    const customWrapper = ({ children }: { children: React.ReactNode }) =>
      React.createElement(QueryClientProvider, { client: queryClient }, children)

    const { result } = renderHook(() => useUploadClinicFavicon(), { wrapper: customWrapper })
    act(() => result.current.mutate(file))

    await waitFor(() => expect(result.current.isSuccess).toBe(true))

    expect(invalidate).toHaveBeenCalledWith({ queryKey: ['clinics', 'me'] })
  })

  it('invalidates ["clinics", clinicId] on success with clinicId', async () => {
    const file = new File(['ico'], 'favicon.ico', { type: 'image/x-icon' })
    ;(uploadClinicFaviconUseCase as jest.Mock).mockResolvedValue(makeModel())
    const queryClient = createQueryClient()
    const invalidate = jest.spyOn(queryClient, 'invalidateQueries')
    const customWrapper = ({ children }: { children: React.ReactNode }) =>
      React.createElement(QueryClientProvider, { client: queryClient }, children)

    const { result } = renderHook(() => useUploadClinicFavicon('clinic-uuid-1'), { wrapper: customWrapper })
    act(() => result.current.mutate(file))

    await waitFor(() => expect(result.current.isSuccess).toBe(true))

    expect(invalidate).toHaveBeenCalledWith({ queryKey: ['clinics', 'clinic-uuid-1'] })
  })

  it('does not invalidate queries on error', async () => {
    const file = new File(['ico'], 'favicon.ico', { type: 'image/x-icon' })
    ;(uploadClinicFaviconUseCase as jest.Mock).mockRejectedValue(new Error('fail'))
    const queryClient = createQueryClient()
    const invalidate = jest.spyOn(queryClient, 'invalidateQueries')
    const customWrapper = ({ children }: { children: React.ReactNode }) =>
      React.createElement(QueryClientProvider, { client: queryClient }, children)

    const { result } = renderHook(() => useUploadClinicFavicon(), { wrapper: customWrapper })
    act(() => result.current.mutate(file))

    await waitFor(() => expect(result.current.isError).toBe(true))

    expect(invalidate).not.toHaveBeenCalled()
  })
})
