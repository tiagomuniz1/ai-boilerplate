jest.mock('../services/medications.service')

import { medicationsService } from '../services/medications.service'
import { deleteMedicationUseCase } from './delete-medication.use-case'

describe('deleteMedicationUseCase', () => {
  beforeEach(() => jest.clearAllMocks())

  it('removes the medication by id', async () => {
    ;(medicationsService.remove as jest.Mock).mockResolvedValue(undefined)

    await deleteMedicationUseCase('m1')

    expect(medicationsService.remove).toHaveBeenCalledWith('m1')
  })
})
