jest.mock('../use-cases/download-exam-request-pdf.use-case')

import React from 'react'
import { act, renderHook, waitFor } from '@testing-library/react'
import { QueryClient, QueryClientProvider } from '@tanstack/react-query'
import { downloadExamRequestPdfUseCase } from '../use-cases/download-exam-request-pdf.use-case'
import { useDownloadExamRequestPdf } from './use-download-exam-request-pdf.hook'

function makeWrapper(client: QueryClient) {
  return function wrapper({ children }: { children: React.ReactNode }) {
    return React.createElement(QueryClientProvider, { client }, children)
  }
}

describe('useDownloadExamRequestPdf', () => {
  beforeEach(() => jest.clearAllMocks())

  it('calls downloadExamRequestPdfUseCase with id and fileName', async () => {
    ;(downloadExamRequestPdfUseCase as jest.Mock).mockResolvedValue(undefined)

    const client = new QueryClient({ defaultOptions: { mutations: { retry: false } } })
    const { result } = renderHook(() => useDownloadExamRequestPdf(), { wrapper: makeWrapper(client) })

    await act(async () => {
      result.current.mutate({ id: 'exam-uuid', fileName: 'pedido-exames-exam-uuid.pdf' })
    })

    await waitFor(() => expect(result.current.isSuccess).toBe(true))
    expect(downloadExamRequestPdfUseCase).toHaveBeenCalledWith('exam-uuid', 'pedido-exames-exam-uuid.pdf')
  })

  it('calls use-case without fileName when omitted', async () => {
    ;(downloadExamRequestPdfUseCase as jest.Mock).mockResolvedValue(undefined)

    const client = new QueryClient({ defaultOptions: { mutations: { retry: false } } })
    const { result } = renderHook(() => useDownloadExamRequestPdf(), { wrapper: makeWrapper(client) })

    await act(async () => {
      result.current.mutate({ id: 'exam-uuid' })
    })

    await waitFor(() => expect(result.current.isSuccess).toBe(true))
    expect(downloadExamRequestPdfUseCase).toHaveBeenCalledWith('exam-uuid', undefined)
  })

  it('exposes error state when use-case throws', async () => {
    ;(downloadExamRequestPdfUseCase as jest.Mock).mockRejectedValue({ status: 403 })

    const client = new QueryClient({ defaultOptions: { mutations: { retry: false } } })
    const { result } = renderHook(() => useDownloadExamRequestPdf(), { wrapper: makeWrapper(client) })

    await act(async () => {
      result.current.mutate({ id: 'exam-uuid' })
    })

    await waitFor(() => expect(result.current.isError).toBe(true))
  })
})
