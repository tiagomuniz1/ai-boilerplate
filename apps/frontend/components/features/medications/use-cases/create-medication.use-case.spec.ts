jest.mock('../services/medications.service')
jest.mock('../mappers/to-medication-model.mapper')
jest.mock('../mappers/to-create-medication-dto.mapper')

import { medicationsService } from '../services/medications.service'
import { toMedicationModel } from '../mappers/to-medication-model.mapper'
import { toCreateMedicationDto } from '../mappers/to-create-medication-dto.mapper'
import { createMedicationUseCase } from './create-medication.use-case'

describe('createMedicationUseCase', () => {
  beforeEach(() => jest.clearAllMocks())

  it('maps the input to a dto, creates and maps the response back', async () => {
    const dto = { name: 'Dipirona' }
    const responseDto = { id: 'm1' }
    const model = { id: 'm1', name: 'Dipirona' }
    ;(toCreateMedicationDto as jest.Mock).mockReturnValue(dto)
    ;(medicationsService.create as jest.Mock).mockResolvedValue(responseDto)
    ;(toMedicationModel as jest.Mock).mockReturnValue(model)

    const result = await createMedicationUseCase({ name: 'Dipirona' })

    expect(toCreateMedicationDto).toHaveBeenCalledWith({ name: 'Dipirona' })
    expect(medicationsService.create).toHaveBeenCalledWith(dto)
    expect(toMedicationModel).toHaveBeenCalledWith(responseDto)
    expect(result).toBe(model)
  })
})
