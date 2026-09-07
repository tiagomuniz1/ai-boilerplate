jest.mock('../use-cases/list-vaccine-indications.use-case')
jest.mock('../use-cases/create-vaccine-indication.use-case')
jest.mock('../use-cases/delete-vaccine-indication.use-case')
jest.mock('../use-cases/download-vaccine-indication-pdf.use-case')

import React from 'react'
import { act, renderHook, waitFor } from '@testing-library/react'
import { QueryClient, QueryClientProvider } from '@tanstack/react-query'
import { listVaccineIndicationsUseCase } from '../use-cases/list-vaccine-indications.use-case'
import { createVaccineIndicationUseCase } from '../use-cases/create-vaccine-indication.use-case'
import { deleteVaccineIndicationUseCase } from '../use-cases/delete-vaccine-indication.use-case'
import { downloadVaccineIndicationPdfUseCase } from '../use-cases/download-vaccine-indication-pdf.use-case'
import { useVaccineIndications } from './use-vaccine-indications.hook'
import { useCreateVaccineIndication } from './use-create-vaccine-indication.hook'
import { useDeleteVaccineIndication } from './use-delete-vaccine-indication.hook'
import { useDownloadVaccineIndicationPdf } from './use-download-vaccine-indication-pdf.hook'

function makeWrapper(client: QueryClient) {
  return function wrapper({ children }: { children: React.ReactNode }) {
    return React.createElement(QueryClientProvider, { client }, children)
  }
}

const makeClient = () =>
  new QueryClient({ defaultOptions: { queries: { retry: false }, mutations: { retry: false } } })

describe('useVaccineIndications', () => {
  beforeEach(() => jest.clearAllMocks())

  it('busca as indicações da consulta', async () => {
    ;(listVaccineIndicationsUseCase as jest.Mock).mockResolvedValue([{ id: 'indication-uuid' }])

    const { result } = renderHook(() => useVaccineIndications('appointment-uuid'), {
      wrapper: makeWrapper(makeClient()),
    })

    await waitFor(() => expect(result.current.isSuccess).toBe(true))
    expect(listVaccineIndicationsUseCase).toHaveBeenCalledWith('appointment-uuid')
    expect(result.current.data).toEqual([{ id: 'indication-uuid' }])
  })
})

describe('useCreateVaccineIndication', () => {
  beforeEach(() => jest.clearAllMocks())

  // A lista da consulta tem de refletir a indicação recém-emitida sem recarregar.
  it('invalida a lista da consulta que a indicação pertence', async () => {
    ;(createVaccineIndicationUseCase as jest.Mock).mockResolvedValue({
      id: 'indication-uuid',
      appointmentId: 'appointment-uuid',
    })

    const client = makeClient()
    const invalidateSpy = jest.spyOn(client, 'invalidateQueries')
    const { result } = renderHook(() => useCreateVaccineIndication(), { wrapper: makeWrapper(client) })

    await act(async () => {
      result.current.mutate({ appointmentId: 'appointment-uuid', items: [{ vaccineId: 'v1' }] })
    })

    await waitFor(() => expect(result.current.isSuccess).toBe(true))
    expect(invalidateSpy).toHaveBeenCalledWith({ queryKey: ['vaccine-indications', 'appointment-uuid'] })
  })
})

describe('useDeleteVaccineIndication', () => {
  beforeEach(() => jest.clearAllMocks())

  it('exclui e invalida a lista da consulta', async () => {
    ;(deleteVaccineIndicationUseCase as jest.Mock).mockResolvedValue(undefined)

    const client = makeClient()
    const invalidateSpy = jest.spyOn(client, 'invalidateQueries')
    const { result } = renderHook(() => useDeleteVaccineIndication('appointment-uuid'), {
      wrapper: makeWrapper(client),
    })

    await act(async () => {
      result.current.mutate('indication-uuid')
    })

    await waitFor(() => expect(result.current.isSuccess).toBe(true))
    expect(deleteVaccineIndicationUseCase).toHaveBeenCalledWith('indication-uuid')
    expect(invalidateSpy).toHaveBeenCalledWith({ queryKey: ['vaccine-indications', 'appointment-uuid'] })
  })
})

describe('useDownloadVaccineIndicationPdf', () => {
  beforeEach(() => jest.clearAllMocks())

  it('repassa id e nome do arquivo', async () => {
    ;(downloadVaccineIndicationPdfUseCase as jest.Mock).mockResolvedValue(undefined)

    const { result } = renderHook(() => useDownloadVaccineIndicationPdf(), {
      wrapper: makeWrapper(makeClient()),
    })

    await act(async () => {
      result.current.mutate({ id: 'indication-uuid', fileName: 'custom.pdf' })
    })

    await waitFor(() => expect(result.current.isSuccess).toBe(true))
    expect(downloadVaccineIndicationPdfUseCase).toHaveBeenCalledWith('indication-uuid', 'custom.pdf')
  })
})
