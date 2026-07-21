jest.mock('../services/prescription-templates.service')
jest.mock('../mappers/to-prescription-template-model.mapper')

import { prescriptionTemplatesService } from '../services/prescription-templates.service'
import { toPrescriptionTemplateModel } from '../mappers/to-prescription-template-model.mapper'
import { listPrescriptionTemplatesUseCase } from './list-prescription-templates.use-case'

const mockService = prescriptionTemplatesService as jest.Mocked<typeof prescriptionTemplatesService>
const mockMapper = toPrescriptionTemplateModel as jest.Mock

describe('listPrescriptionTemplatesUseCase', () => {
  beforeEach(() => jest.clearAllMocks())

  it('calls service.getAll and maps each dto', async () => {
    const dto1 = { id: 'tpl-1' }
    const dto2 = { id: 'tpl-2' }
    const model1 = { id: 'tpl-1' }
    const model2 = { id: 'tpl-2' }
    mockService.getAll.mockResolvedValue([dto1, dto2] as any)
    mockMapper.mockReturnValueOnce(model1).mockReturnValueOnce(model2)

    const result = await listPrescriptionTemplatesUseCase()

    expect(mockService.getAll).toHaveBeenCalledWith(undefined)
    expect(mockMapper).toHaveBeenCalledTimes(2)
    expect(result).toEqual([model1, model2])
  })

  it('forwards params to service.getAll', async () => {
    mockService.getAll.mockResolvedValue([])

    await listPrescriptionTemplatesUseCase({ professionalId: 'doctor-uuid' })

    expect(mockService.getAll).toHaveBeenCalledWith({ professionalId: 'doctor-uuid' })
  })

  it('returns empty array when no templates', async () => {
    mockService.getAll.mockResolvedValue([])
    const result = await listPrescriptionTemplatesUseCase()
    expect(result).toEqual([])
  })
})
