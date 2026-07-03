jest.mock('../services/prescription-templates.service')
jest.mock('../mappers/to-prescription-template-model.mapper')

import { prescriptionTemplatesService } from '../services/prescription-templates.service'
import { toPrescriptionTemplateModel } from '../mappers/to-prescription-template-model.mapper'
import { getPrescriptionTemplateUseCase } from './get-prescription-template.use-case'

const mockService = prescriptionTemplatesService as jest.Mocked<typeof prescriptionTemplatesService>
const mockToModel = toPrescriptionTemplateModel as jest.Mock

describe('getPrescriptionTemplateUseCase', () => {
  beforeEach(() => jest.clearAllMocks())

  it('calls service.getById and maps the dto', async () => {
    const dto = { id: 'tpl-uuid' }
    const model = { id: 'tpl-uuid' }
    mockService.getById.mockResolvedValue(dto as any)
    mockToModel.mockReturnValue(model)

    const result = await getPrescriptionTemplateUseCase('tpl-uuid')

    expect(mockService.getById).toHaveBeenCalledWith('tpl-uuid')
    expect(mockToModel).toHaveBeenCalledWith(dto)
    expect(result).toBe(model)
  })

  it('propagates service errors', async () => {
    mockService.getById.mockRejectedValue({ status: 404 })
    await expect(getPrescriptionTemplateUseCase('tpl-uuid')).rejects.toMatchObject({ status: 404 })
  })
})
