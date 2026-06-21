jest.mock('../services/medical-records.service')
jest.mock('../mappers/to-medical-record-model.mapper')

import { medicalRecordsService } from '../services/medical-records.service'
import { toMedicalRecordModel } from '../mappers/to-medical-record-model.mapper'
import { getMedicalRecordUseCase } from './get-medical-record.use-case'

describe('getMedicalRecordUseCase', () => {
  beforeEach(() => jest.clearAllMocks())

  it('fetches by id and maps to model', async () => {
    const dto = { id: 'uuid-1' }
    const model = { id: 'uuid-1' }
    ;(medicalRecordsService.getById as jest.Mock).mockResolvedValue(dto)
    ;(toMedicalRecordModel as jest.Mock).mockReturnValue(model)

    const result = await getMedicalRecordUseCase('uuid-1')

    expect(medicalRecordsService.getById).toHaveBeenCalledWith('uuid-1')
    expect(toMedicalRecordModel).toHaveBeenCalledWith(dto)
    expect(result).toBe(model)
  })
})
