jest.mock('../services/prescription-templates.service')

import { prescriptionTemplatesService } from '../services/prescription-templates.service'
import { deletePrescriptionTemplateUseCase } from './delete-prescription-template.use-case'

const mockService = prescriptionTemplatesService as jest.Mocked<typeof prescriptionTemplatesService>

describe('deletePrescriptionTemplateUseCase', () => {
  beforeEach(() => jest.clearAllMocks())

  it('calls service.remove with the given id', async () => {
    mockService.remove.mockResolvedValue(undefined as any)
    await deletePrescriptionTemplateUseCase('tpl-uuid')
    expect(mockService.remove).toHaveBeenCalledWith('tpl-uuid')
  })

  it('propagates service errors', async () => {
    mockService.remove.mockRejectedValue({ status: 404 })
    await expect(deletePrescriptionTemplateUseCase('tpl-uuid')).rejects.toMatchObject({ status: 404 })
  })
})
