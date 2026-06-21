jest.mock('../services/canonical-fields-admin.service')
jest.mock('../mappers/to-canonical-field-model.mapper')
jest.mock('../mappers/to-create-canonical-field-dto.mapper')

import { MedicalRecordFieldType } from '@app/shared'
import { canonicalFieldsAdminService } from '../services/canonical-fields-admin.service'
import { toCanonicalFieldModel } from '../mappers/to-canonical-field-model.mapper'
import { toCreateCanonicalFieldDto } from '../mappers/to-create-canonical-field-dto.mapper'
import { createCanonicalFieldUseCase } from './create-canonical-field.use-case'

describe('createCanonicalFieldUseCase', () => {
  beforeEach(() => jest.clearAllMocks())

  it('maps input to DTO, calls service, maps response to model', async () => {
    const input = { canonicalKey: 'weight', label: 'Peso', type: MedicalRecordFieldType.NUMBER }
    const mappedDto = { canonicalKey: 'weight', label: 'Peso', type: MedicalRecordFieldType.NUMBER }
    const responseDto = { id: 'uuid-1', ...mappedDto, options: null, unit: null, specialtyId: null, description: null, isActive: true }
    const model = { id: 'uuid-1', ...mappedDto, options: null, unit: null, specialtyId: null, description: null, isActive: true }

    ;(toCreateCanonicalFieldDto as jest.Mock).mockReturnValue(mappedDto)
    ;(canonicalFieldsAdminService.create as jest.Mock).mockResolvedValue(responseDto)
    ;(toCanonicalFieldModel as jest.Mock).mockReturnValue(model)

    const result = await createCanonicalFieldUseCase(input)

    expect(toCreateCanonicalFieldDto).toHaveBeenCalledWith(input)
    expect(canonicalFieldsAdminService.create).toHaveBeenCalledWith(mappedDto)
    expect(toCanonicalFieldModel).toHaveBeenCalledWith(responseDto)
    expect(result).toBe(model)
  })
})
