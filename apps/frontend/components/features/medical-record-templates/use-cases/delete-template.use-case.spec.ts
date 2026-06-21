jest.mock('../services/medical-record-templates.service')

import { medicalRecordTemplatesService } from '../services/medical-record-templates.service'
import { deleteTemplateUseCase } from './delete-template.use-case'

describe('deleteTemplateUseCase', () => {
  beforeEach(() => jest.clearAllMocks())

  it('calls service.remove with id', async () => {
    ;(medicalRecordTemplatesService.remove as jest.Mock).mockResolvedValue(undefined)
    await deleteTemplateUseCase('uuid-1')
    expect(medicalRecordTemplatesService.remove).toHaveBeenCalledWith('uuid-1')
  })
})
