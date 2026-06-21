jest.mock('../services/canonical-fields-admin.service')
jest.mock('../mappers/to-canonical-field-model.mapper')

import { MedicalRecordFieldType } from '@app/shared'
import { canonicalFieldsAdminService } from '../services/canonical-fields-admin.service'
import { toCanonicalFieldModel } from '../mappers/to-canonical-field-model.mapper'
import { listCanonicalFieldsAdminUseCase } from './list-canonical-fields-admin.use-case'

const makeDto = () => ({
  id: 'uuid-1',
  canonicalKey: 'blood_pressure',
  label: 'Pressão arterial',
  type: MedicalRecordFieldType.NUMBER,
  options: null,
  unit: null,
  specialtyId: null,
  description: null,
  isActive: true,
})

const makeModel = () => ({ ...makeDto() })

describe('listCanonicalFieldsAdminUseCase', () => {
  beforeEach(() => jest.clearAllMocks())

  it('fetches from service and maps to model', async () => {
    const dto = makeDto()
    const model = makeModel()
    ;(canonicalFieldsAdminService.getAll as jest.Mock).mockResolvedValue([dto])
    ;(toCanonicalFieldModel as jest.Mock).mockReturnValue(model)

    const result = await listCanonicalFieldsAdminUseCase()

    expect(canonicalFieldsAdminService.getAll).toHaveBeenCalledWith(undefined)
    expect(toCanonicalFieldModel).toHaveBeenCalledWith(dto)
    expect(result).toEqual([model])
  })

  it('passes params to service', async () => {
    ;(canonicalFieldsAdminService.getAll as jest.Mock).mockResolvedValue([])

    await listCanonicalFieldsAdminUseCase({ includeInactive: true, specialtyId: 'spec-uuid' })

    expect(canonicalFieldsAdminService.getAll).toHaveBeenCalledWith({
      includeInactive: true,
      specialtyId: 'spec-uuid',
    })
  })

  it('returns empty array when service returns empty', async () => {
    ;(canonicalFieldsAdminService.getAll as jest.Mock).mockResolvedValue([])

    const result = await listCanonicalFieldsAdminUseCase()

    expect(result).toEqual([])
    expect(toCanonicalFieldModel).not.toHaveBeenCalled()
  })
})
