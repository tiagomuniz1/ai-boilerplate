jest.mock('../services/medications.service')
jest.mock('../mappers/to-medication-model.mapper')
jest.mock('../mappers/to-update-medication-dto.mapper')

import { medicationsService } from '../services/medications.service'
import { toMedicationModel } from '../mappers/to-medication-model.mapper'
import { toUpdateMedicationDto } from '../mappers/to-update-medication-dto.mapper'
import { updateMedicationUseCase } from './update-medication.use-case'

describe('updateMedicationUseCase', () => {
  beforeEach(() => jest.clearAllMocks())

  it('maps the input to a dto, updates and maps the response back', async () => {
    const dto = { isActive: false }
    const responseDto = { id: 'm1' }
    const model = { id: 'm1', isActive: false }
    ;(toUpdateMedicationDto as jest.Mock).mockReturnValue(dto)
    ;(medicationsService.update as jest.Mock).mockResolvedValue(responseDto)
    ;(toMedicationModel as jest.Mock).mockReturnValue(model)

    const result = await updateMedicationUseCase('m1', { isActive: false })

    expect(toUpdateMedicationDto).toHaveBeenCalledWith({ isActive: false })
    expect(medicationsService.update).toHaveBeenCalledWith('m1', dto)
    expect(toMedicationModel).toHaveBeenCalledWith(responseDto)
    expect(result).toBe(model)
  })
})
