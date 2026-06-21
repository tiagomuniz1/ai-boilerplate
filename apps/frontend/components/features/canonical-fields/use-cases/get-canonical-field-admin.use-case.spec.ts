jest.mock('../services/canonical-fields-admin.service')
jest.mock('../mappers/to-canonical-field-model.mapper')

import { MedicalRecordFieldType } from '@app/shared'
import { canonicalFieldsAdminService } from '../services/canonical-fields-admin.service'
import { toCanonicalFieldModel } from '../mappers/to-canonical-field-model.mapper'
import { getCanonicalFieldAdminUseCase } from './get-canonical-field-admin.use-case'

describe('getCanonicalFieldAdminUseCase', () => {
  beforeEach(() => jest.clearAllMocks())

  it('fetches by id and maps to model', async () => {
    const dto = {
      id: 'uuid-1',
      canonicalKey: 'blood_pressure',
      label: 'Pressão arterial',
      type: MedicalRecordFieldType.NUMBER,
      options: null,
      unit: null,
      specialtyId: null,
      description: null,
      isActive: true,
    }
    const model = { ...dto }
    ;(canonicalFieldsAdminService.getById as jest.Mock).mockResolvedValue(dto)
    ;(toCanonicalFieldModel as jest.Mock).mockReturnValue(model)

    const result = await getCanonicalFieldAdminUseCase('uuid-1')

    expect(canonicalFieldsAdminService.getById).toHaveBeenCalledWith('uuid-1')
    expect(toCanonicalFieldModel).toHaveBeenCalledWith(dto)
    expect(result).toBe(model)
  })
})
