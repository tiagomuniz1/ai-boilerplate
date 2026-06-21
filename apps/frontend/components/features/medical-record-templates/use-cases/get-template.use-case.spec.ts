jest.mock('../services/medical-record-templates.service')
jest.mock('../mappers/to-template-model.mapper')

import { medicalRecordTemplatesService } from '../services/medical-record-templates.service'
import { toTemplateModel } from '../mappers/to-template-model.mapper'
import { getTemplateUseCase } from './get-template.use-case'

describe('getTemplateUseCase', () => {
  beforeEach(() => jest.clearAllMocks())

  it('fetches by id and maps to model', async () => {
    const rawDto = { id: 'uuid-1', name: 'Template' }
    const model = { id: 'uuid-1', name: 'Template' }
    ;(medicalRecordTemplatesService.getById as jest.Mock).mockResolvedValue(rawDto)
    ;(toTemplateModel as jest.Mock).mockReturnValue(model)

    const result = await getTemplateUseCase('uuid-1')

    expect(medicalRecordTemplatesService.getById).toHaveBeenCalledWith('uuid-1')
    expect(toTemplateModel).toHaveBeenCalledWith(rawDto)
    expect(result).toBe(model)
  })
})
