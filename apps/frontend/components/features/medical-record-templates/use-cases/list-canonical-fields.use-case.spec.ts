jest.mock('../services/canonical-fields.service')
jest.mock('../mappers/to-canonical-field-model.mapper')

import { canonicalFieldsService } from '../services/canonical-fields.service'
import { toCanonicalFieldModel } from '../mappers/to-canonical-field-model.mapper'
import { listCanonicalFieldsUseCase } from './list-canonical-fields.use-case'

describe('listCanonicalFieldsUseCase', () => {
  beforeEach(() => jest.clearAllMocks())

  it('calls the service with no arguments', async () => {
    ;(canonicalFieldsService.getAll as jest.Mock).mockResolvedValue([])
    await listCanonicalFieldsUseCase()
    expect(canonicalFieldsService.getAll).toHaveBeenCalledWith()
  })

  it('maps each dto to model', async () => {
    const dto = { id: 'uuid-1', canonicalKey: 'bp', label: 'PA' }
    const model = { id: 'uuid-1', canonicalKey: 'bp', label: 'PA' }
    ;(canonicalFieldsService.getAll as jest.Mock).mockResolvedValue([dto])
    ;(toCanonicalFieldModel as jest.Mock).mockReturnValue(model)

    const result = await listCanonicalFieldsUseCase()
    expect(result).toEqual([model])
    expect(toCanonicalFieldModel).toHaveBeenCalledWith(dto)
  })

  it('returns empty array when service returns empty', async () => {
    ;(canonicalFieldsService.getAll as jest.Mock).mockResolvedValue([])
    const result = await listCanonicalFieldsUseCase()
    expect(result).toEqual([])
  })
})
