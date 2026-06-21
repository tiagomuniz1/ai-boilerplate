jest.mock('../services/medical-record-templates.service')
jest.mock('../mappers/to-template-model.mapper')

import { medicalRecordTemplatesService } from '../services/medical-record-templates.service'
import { toPaginatedTemplatesModel } from '../mappers/to-template-model.mapper'
import { listTemplatesUseCase } from './list-templates.use-case'

describe('listTemplatesUseCase', () => {
  beforeEach(() => jest.clearAllMocks())

  it('fetches from service and maps to paginated model', async () => {
    const raw = { data: [], total: 0, page: 1, limit: 20 }
    const mapped = { data: [], total: 0, page: 1, limit: 20 }
    ;(medicalRecordTemplatesService.getAll as jest.Mock).mockResolvedValue(raw)
    ;(toPaginatedTemplatesModel as jest.Mock).mockReturnValue(mapped)

    const result = await listTemplatesUseCase()

    expect(medicalRecordTemplatesService.getAll).toHaveBeenCalledWith(undefined)
    expect(toPaginatedTemplatesModel).toHaveBeenCalledWith(raw)
    expect(result).toBe(mapped)
  })

  it('passes params to service', async () => {
    ;(medicalRecordTemplatesService.getAll as jest.Mock).mockResolvedValue({ data: [], total: 0, page: 2, limit: 10 })
    ;(toPaginatedTemplatesModel as jest.Mock).mockReturnValue({})

    await listTemplatesUseCase({ page: 2, limit: 10 })
    expect(medicalRecordTemplatesService.getAll).toHaveBeenCalledWith({ page: 2, limit: 10 })
  })
})
