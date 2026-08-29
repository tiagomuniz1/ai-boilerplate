jest.mock('../services/medical-record-templates.service')
jest.mock('../mappers/to-create-template-dto.mapper')
jest.mock('../mappers/to-template-model.mapper')

import { MedicalRecordFieldType } from '@app/shared'
import { medicalRecordTemplatesService } from '../services/medical-record-templates.service'
import { toCreateTemplateDto } from '../mappers/to-create-template-dto.mapper'
import { toTemplateModel } from '../mappers/to-template-model.mapper'
import { createTemplateUseCase } from './create-template.use-case'

describe('createTemplateUseCase', () => {
  beforeEach(() => jest.clearAllMocks())

  it('maps input to DTO, calls service, maps response', async () => {
    const input = {
      specialtyId: 'spec-uuid',
      name: 'Anamnese',
      fields: [{ label: 'Sintoma', type: MedicalRecordFieldType.TEXT, required: true, order: 0, options: [], placeholder: '', helpText: '', canonical: false, canonicalKey: '', sectionKey: '' }],
  // `sections` entrou no input quando o template passou a ter seções.
  sections: [],
    }
    const mappedDto = { specialtyId: 'spec-uuid', name: 'Anamnese', fields: [] }
    const responseDto = { id: 'uuid-1', name: 'Anamnese' }
    const model = { id: 'uuid-1', name: 'Anamnese' }

    ;(toCreateTemplateDto as jest.Mock).mockReturnValue(mappedDto)
    ;(medicalRecordTemplatesService.create as jest.Mock).mockResolvedValue(responseDto)
    ;(toTemplateModel as jest.Mock).mockReturnValue(model)

    const result = await createTemplateUseCase(input)

    expect(toCreateTemplateDto).toHaveBeenCalledWith(input)
    expect(medicalRecordTemplatesService.create).toHaveBeenCalledWith(mappedDto)
    expect(toTemplateModel).toHaveBeenCalledWith(responseDto)
    expect(result).toBe(model)
  })
})
