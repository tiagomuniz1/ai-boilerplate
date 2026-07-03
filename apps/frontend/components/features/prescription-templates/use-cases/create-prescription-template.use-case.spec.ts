jest.mock('../services/prescription-templates.service')
jest.mock('../mappers/to-create-prescription-template-dto.mapper')
jest.mock('../mappers/to-prescription-template-model.mapper')

import { prescriptionTemplatesService } from '../services/prescription-templates.service'
import { toCreatePrescriptionTemplateDto } from '../mappers/to-create-prescription-template-dto.mapper'
import { toPrescriptionTemplateModel } from '../mappers/to-prescription-template-model.mapper'
import { createPrescriptionTemplateUseCase } from './create-prescription-template.use-case'

const mockService = prescriptionTemplatesService as jest.Mocked<typeof prescriptionTemplatesService>
const mockToDto = toCreatePrescriptionTemplateDto as jest.Mock
const mockToModel = toPrescriptionTemplateModel as jest.Mock

describe('createPrescriptionTemplateUseCase', () => {
  beforeEach(() => jest.clearAllMocks())

  it('calls toCreatePrescriptionTemplateDto, service.create and toPrescriptionTemplateModel', async () => {
    const input = { name: 'Modelo A', items: [{ medicationId: 'med-uuid', instructions: 'Tomar 1 cp' }] }
    const dto = { name: 'Modelo A', items: [{ medicationId: 'med-uuid', instructions: 'Tomar 1 cp' }] }
    const responseDto = { id: 'tpl-uuid' }
    const model = { id: 'tpl-uuid' }

    mockToDto.mockReturnValue(dto)
    mockService.create.mockResolvedValue(responseDto as any)
    mockToModel.mockReturnValue(model)

    const result = await createPrescriptionTemplateUseCase(input)

    expect(mockToDto).toHaveBeenCalledWith(input)
    expect(mockService.create).toHaveBeenCalledWith(dto)
    expect(mockToModel).toHaveBeenCalledWith(responseDto)
    expect(result).toBe(model)
  })

  it('propagates service errors', async () => {
    mockToDto.mockReturnValue({})
    mockService.create.mockRejectedValue({ status: 422 })
    await expect(createPrescriptionTemplateUseCase({ name: 'X', items: [] })).rejects.toMatchObject({ status: 422 })
  })
})
