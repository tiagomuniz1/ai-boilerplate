jest.mock('../use-cases/download-exam-result-file.use-case')

import React from 'react'
import { act, renderHook, waitFor } from '@testing-library/react'
import { QueryClient, QueryClientProvider } from '@tanstack/react-query'
import { downloadExamResultFileUseCase } from '../use-cases/download-exam-result-file.use-case'
import { useDownloadExamResultFile } from './use-download-exam-result-file.hook'

function makeWrapper(client: QueryClient) {
  return function wrapper({ children }: { children: React.ReactNode }) {
    return React.createElement(QueryClientProvider, { client }, children)
  }
}

describe('useDownloadExamResultFile', () => {
  beforeEach(() => jest.clearAllMocks())

  it('calls downloadExamResultFileUseCase with id and fileName', async () => {
    ;(downloadExamResultFileUseCase as jest.Mock).mockResolvedValue(undefined)

    const client = new QueryClient({ defaultOptions: { mutations: { retry: false } } })
    const { result } = renderHook(() => useDownloadExamResultFile(), { wrapper: makeWrapper(client) })

    await act(async () => {
      result.current.mutate({ id: 'result-uuid', fileName: 'hemograma.pdf' })
    })

    await waitFor(() => expect(result.current.isSuccess).toBe(true))
    expect(downloadExamResultFileUseCase).toHaveBeenCalledWith('result-uuid', 'hemograma.pdf')
  })

  it('exposes error state when use-case throws', async () => {
    ;(downloadExamResultFileUseCase as jest.Mock).mockRejectedValue({ status: 403 })

    const client = new QueryClient({ defaultOptions: { mutations: { retry: false } } })
    const { result } = renderHook(() => useDownloadExamResultFile(), { wrapper: makeWrapper(client) })

    await act(async () => {
      result.current.mutate({ id: 'result-uuid', fileName: 'hemograma.pdf' })
    })

    await waitFor(() => expect(result.current.isError).toBe(true))
  })
})
