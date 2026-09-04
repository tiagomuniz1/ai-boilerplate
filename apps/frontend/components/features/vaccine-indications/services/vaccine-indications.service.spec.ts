jest.mock('@/lib/api-client')

import { apiClient } from '@/lib/api-client'
import { vaccineIndicationsService } from './vaccine-indications.service'

const mockApiClient = apiClient as jest.Mocked<typeof apiClient>

describe('vaccineIndicationsService', () => {
  beforeEach(() => jest.clearAllMocks())

  it('lista sempre com o recorte da consulta', async () => {
    mockApiClient.get.mockResolvedValue([])
    await vaccineIndicationsService.getByAppointment('appointment-uuid')
    expect(mockApiClient.get).toHaveBeenCalledWith('/vaccine-indications?appointmentId=appointment-uuid')
  })

  it('busca por id', async () => {
    mockApiClient.get.mockResolvedValue({})
    await vaccineIndicationsService.getById('indication-uuid')
    expect(mockApiClient.get).toHaveBeenCalledWith('/vaccine-indications/indication-uuid')
  })

  it('cria', async () => {
    mockApiClient.post.mockResolvedValue({})
    const dto = { appointmentId: 'appointment-uuid', items: [{ vaccineId: 'v1' }] } as any
    await vaccineIndicationsService.create(dto)
    expect(mockApiClient.post).toHaveBeenCalledWith('/vaccine-indications', dto)
  })

  it('exclui', async () => {
    mockApiClient.delete.mockResolvedValue(undefined)
    await vaccineIndicationsService.remove('indication-uuid')
    expect(mockApiClient.delete).toHaveBeenCalledWith('/vaccine-indications/indication-uuid')
  })

  it('baixa o PDF como blob', async () => {
    mockApiClient.getBlob.mockResolvedValue(new Blob())
    await vaccineIndicationsService.downloadPdf('indication-uuid')
    expect(mockApiClient.getBlob).toHaveBeenCalledWith('/vaccine-indications/indication-uuid/pdf')
  })
})
