jest.mock('../services/medications.service')
jest.mock('../mappers/to-medication-model.mapper')

import { medicationsService } from '../services/medications.service'
import { toMedicationModel } from '../mappers/to-medication-model.mapper'
import { getMedicationUseCase } from './get-medication.use-case'

describe('getMedicationUseCase', () => {
  beforeEach(() => jest.clearAllMocks())

  it('fetches by id and maps to model', async () => {
    const dto = { id: 'm1' }
    const model = { id: 'm1', name: 'Dipirona' }
    ;(medicationsService.getById as jest.Mock).mockResolvedValue(dto)
    ;(toMedicationModel as jest.Mock).mockReturnValue(model)

    const result = await getMedicationUseCase('m1')

    expect(medicationsService.getById).toHaveBeenCalledWith('m1')
    expect(toMedicationModel).toHaveBeenCalledWith(dto)
    expect(result).toBe(model)
  })
})
