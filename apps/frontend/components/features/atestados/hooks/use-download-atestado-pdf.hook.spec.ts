jest.mock('../use-cases/download-atestado-pdf.use-case')

import React from 'react'
import { act, renderHook, waitFor } from '@testing-library/react'
import { QueryClient, QueryClientProvider } from '@tanstack/react-query'
import { downloadAtestadoPdfUseCase } from '../use-cases/download-atestado-pdf.use-case'
import { useDownloadAtestadoPdf } from './use-download-atestado-pdf.hook'

function makeWrapper(client: QueryClient) {
  return function wrapper({ children }: { children: React.ReactNode }) {
    return React.createElement(QueryClientProvider, { client }, children)
  }
}

describe('useDownloadAtestadoPdf', () => {
  beforeEach(() => jest.clearAllMocks())

  it('calls downloadAtestadoPdfUseCase with id and fileName', async () => {
    ;(downloadAtestadoPdfUseCase as jest.Mock).mockResolvedValue(undefined)

    const client = new QueryClient({ defaultOptions: { mutations: { retry: false } } })
    const { result } = renderHook(() => useDownloadAtestadoPdf(), { wrapper: makeWrapper(client) })

    await act(async () => {
      result.current.mutate({ id: 'cert-uuid', fileName: 'atestado-cert-uuid.pdf' })
    })

    await waitFor(() => expect(result.current.isSuccess).toBe(true))
    expect(downloadAtestadoPdfUseCase).toHaveBeenCalledWith('cert-uuid', 'atestado-cert-uuid.pdf')
  })

  it('calls use-case without fileName when omitted', async () => {
    ;(downloadAtestadoPdfUseCase as jest.Mock).mockResolvedValue(undefined)

    const client = new QueryClient({ defaultOptions: { mutations: { retry: false } } })
    const { result } = renderHook(() => useDownloadAtestadoPdf(), { wrapper: makeWrapper(client) })

    await act(async () => {
      result.current.mutate({ id: 'cert-uuid' })
    })

    await waitFor(() => expect(result.current.isSuccess).toBe(true))
    expect(downloadAtestadoPdfUseCase).toHaveBeenCalledWith('cert-uuid', undefined)
  })

  it('exposes error state when use-case throws', async () => {
    ;(downloadAtestadoPdfUseCase as jest.Mock).mockRejectedValue({ status: 403 })

    const client = new QueryClient({ defaultOptions: { mutations: { retry: false } } })
    const { result } = renderHook(() => useDownloadAtestadoPdf(), { wrapper: makeWrapper(client) })

    await act(async () => {
      result.current.mutate({ id: 'cert-uuid' })
    })

    await waitFor(() => expect(result.current.isError).toBe(true))
  })
})
