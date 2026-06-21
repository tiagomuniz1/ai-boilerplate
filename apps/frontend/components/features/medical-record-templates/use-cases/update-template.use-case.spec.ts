jest.mock('../services/medical-record-templates.service')
jest.mock('../mappers/to-update-template-dto.mapper')
jest.mock('../mappers/to-template-model.mapper')

import { medicalRecordTemplatesService } from '../services/medical-record-templates.service'
import { toUpdateTemplateDto } from '../mappers/to-update-template-dto.mapper'
import { toTemplateModel } from '../mappers/to-template-model.mapper'
import { updateTemplateUseCase } from './update-template.use-case'

describe('updateTemplateUseCase', () => {
  beforeEach(() => jest.clearAllMocks())

  it('maps input to DTO, calls service, maps response', async () => {
    const input = { name: 'Novo nome' }
    const mappedDto = { name: 'Novo nome' }
    const responseDto = { id: 'uuid-1', name: 'Novo nome' }
    const model = { id: 'uuid-1', name: 'Novo nome' }

    ;(toUpdateTemplateDto as jest.Mock).mockReturnValue(mappedDto)
    ;(medicalRecordTemplatesService.update as jest.Mock).mockResolvedValue(responseDto)
    ;(toTemplateModel as jest.Mock).mockReturnValue(model)

    const result = await updateTemplateUseCase('uuid-1', input)

    expect(toUpdateTemplateDto).toHaveBeenCalledWith(input)
    expect(medicalRecordTemplatesService.update).toHaveBeenCalledWith('uuid-1', mappedDto)
    expect(toTemplateModel).toHaveBeenCalledWith(responseDto)
    expect(result).toBe(model)
  })
})
