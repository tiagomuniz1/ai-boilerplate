jest.mock('../services/canonical-fields-admin.service')
jest.mock('../mappers/to-canonical-field-model.mapper')
jest.mock('../mappers/to-update-canonical-field-dto.mapper')

import { canonicalFieldsAdminService } from '../services/canonical-fields-admin.service'
import { toCanonicalFieldModel } from '../mappers/to-canonical-field-model.mapper'
import { toUpdateCanonicalFieldDto } from '../mappers/to-update-canonical-field-dto.mapper'
import { updateCanonicalFieldUseCase } from './update-canonical-field.use-case'

describe('updateCanonicalFieldUseCase', () => {
  beforeEach(() => jest.clearAllMocks())

  it('maps input to DTO, calls service, maps response to model', async () => {
    const input = { label: 'Novo rótulo', isActive: false }
    const mappedDto = { label: 'Novo rótulo', isActive: false }
    const responseDto = { id: 'uuid-1', canonicalKey: 'weight', label: 'Novo rótulo', isActive: false }
    const model = { id: 'uuid-1', canonicalKey: 'weight', label: 'Novo rótulo', isActive: false }

    ;(toUpdateCanonicalFieldDto as jest.Mock).mockReturnValue(mappedDto)
    ;(canonicalFieldsAdminService.update as jest.Mock).mockResolvedValue(responseDto)
    ;(toCanonicalFieldModel as jest.Mock).mockReturnValue(model)

    const result = await updateCanonicalFieldUseCase('uuid-1', input)

    expect(toUpdateCanonicalFieldDto).toHaveBeenCalledWith(input)
    expect(canonicalFieldsAdminService.update).toHaveBeenCalledWith('uuid-1', mappedDto)
    expect(toCanonicalFieldModel).toHaveBeenCalledWith(responseDto)
    expect(result).toBe(model)
  })
})
