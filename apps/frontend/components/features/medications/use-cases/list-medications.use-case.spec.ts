jest.mock('../services/medications.service')
jest.mock('../mappers/to-medication-model.mapper')

import { medicationsService } from '../services/medications.service'
import { toMedicationModel } from '../mappers/to-medication-model.mapper'
import { listMedicationsUseCase } from './list-medications.use-case'

describe('listMedicationsUseCase', () => {
  beforeEach(() => jest.clearAllMocks())

  it('maps the paginated response data and preserves pagination metadata', async () => {
    const dto = { id: 'm1' }
    const model = { id: 'm1', name: 'Dipirona' }
    ;(medicationsService.getAll as jest.Mock).mockResolvedValue({
      data: [dto],
      total: 1,
      page: 2,
      limit: 20,
    })
    ;(toMedicationModel as jest.Mock).mockReturnValue(model)

    const result = await listMedicationsUseCase({ page: 2 })

    expect(medicationsService.getAll).toHaveBeenCalledWith({ page: 2 })
    expect(toMedicationModel).toHaveBeenCalledWith(dto)
    expect(result).toEqual({ data: [model], total: 1, page: 2, limit: 20 })
  })

  it('handles an empty page', async () => {
    ;(medicationsService.getAll as jest.Mock).mockResolvedValue({
      data: [],
      total: 0,
      page: 1,
      limit: 20,
    })

    const result = await listMedicationsUseCase()

    expect(medicationsService.getAll).toHaveBeenCalledWith(undefined)
    expect(result.data).toEqual([])
    expect(toMedicationModel).not.toHaveBeenCalled()
  })
})
