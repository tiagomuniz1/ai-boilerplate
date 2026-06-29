jest.mock('../use-cases/download-prescription-pdf.use-case')

import React from 'react'
import { act, renderHook, waitFor } from '@testing-library/react'
import { QueryClient, QueryClientProvider } from '@tanstack/react-query'
import { downloadPrescriptionPdfUseCase } from '../use-cases/download-prescription-pdf.use-case'
import { useDownloadPrescriptionPdf } from './use-download-prescription-pdf.hook'

function makeWrapper(client: QueryClient) {
  return function wrapper({ children }: { children: React.ReactNode }) {
    return React.createElement(QueryClientProvider, { client }, children)
  }
}

describe('useDownloadPrescriptionPdf', () => {
  beforeEach(() => jest.clearAllMocks())

  it('calls downloadPrescriptionPdfUseCase with id and fileName', async () => {
    ;(downloadPrescriptionPdfUseCase as jest.Mock).mockResolvedValue(undefined)

    const client = new QueryClient({ defaultOptions: { mutations: { retry: false } } })
    const { result } = renderHook(() => useDownloadPrescriptionPdf(), { wrapper: makeWrapper(client) })

    await act(async () => {
      result.current.mutate({ id: 'rx-uuid', fileName: 'receita-rx-uuid.pdf' })
    })

    await waitFor(() => expect(result.current.isSuccess).toBe(true))
    expect(downloadPrescriptionPdfUseCase).toHaveBeenCalledWith('rx-uuid', 'receita-rx-uuid.pdf')
  })

  it('calls use-case without fileName when omitted', async () => {
    ;(downloadPrescriptionPdfUseCase as jest.Mock).mockResolvedValue(undefined)

    const client = new QueryClient({ defaultOptions: { mutations: { retry: false } } })
    const { result } = renderHook(() => useDownloadPrescriptionPdf(), { wrapper: makeWrapper(client) })

    await act(async () => {
      result.current.mutate({ id: 'rx-uuid' })
    })

    await waitFor(() => expect(result.current.isSuccess).toBe(true))
    expect(downloadPrescriptionPdfUseCase).toHaveBeenCalledWith('rx-uuid', undefined)
  })

  it('exposes error state when use-case throws', async () => {
    ;(downloadPrescriptionPdfUseCase as jest.Mock).mockRejectedValue({ status: 403 })

    const client = new QueryClient({ defaultOptions: { mutations: { retry: false } } })
    const { result } = renderHook(() => useDownloadPrescriptionPdf(), { wrapper: makeWrapper(client) })

    await act(async () => {
      result.current.mutate({ id: 'rx-uuid' })
    })

    await waitFor(() => expect(result.current.isError).toBe(true))
  })
})
