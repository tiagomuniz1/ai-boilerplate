jest.mock('../services/medical-records.service')
jest.mock('../mappers/to-update-medical-record-dto.mapper')
jest.mock('../mappers/to-medical-record-model.mapper')

import { medicalRecordsService } from '../services/medical-records.service'
import { toUpdateMedicalRecordDto } from '../mappers/to-update-medical-record-dto.mapper'
import { toMedicalRecordModel } from '../mappers/to-medical-record-model.mapper'
import { updateMedicalRecordUseCase } from './update-medical-record.use-case'

describe('updateMedicalRecordUseCase', () => {
  beforeEach(() => jest.clearAllMocks())

  it('maps input to DTO, calls service, maps response', async () => {
    const input = { notes: 'Nova obs' }
    const mappedDto = { notes: 'Nova obs' }
    const responseDto = { id: 'uuid-1' }
    const model = { id: 'uuid-1' }

    ;(toUpdateMedicalRecordDto as jest.Mock).mockReturnValue(mappedDto)
    ;(medicalRecordsService.update as jest.Mock).mockResolvedValue(responseDto)
    ;(toMedicalRecordModel as jest.Mock).mockReturnValue(model)

    const result = await updateMedicalRecordUseCase('uuid-1', input)

    expect(toUpdateMedicalRecordDto).toHaveBeenCalledWith(input)
    expect(medicalRecordsService.update).toHaveBeenCalledWith('uuid-1', mappedDto)
    expect(toMedicalRecordModel).toHaveBeenCalledWith(responseDto)
    expect(result).toBe(model)
  })
})
