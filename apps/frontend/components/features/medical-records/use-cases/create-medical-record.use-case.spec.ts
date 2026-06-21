jest.mock('../services/medical-records.service')
jest.mock('../mappers/to-create-medical-record-dto.mapper')
jest.mock('../mappers/to-medical-record-model.mapper')

import { medicalRecordsService } from '../services/medical-records.service'
import { toCreateMedicalRecordDto } from '../mappers/to-create-medical-record-dto.mapper'
import { toMedicalRecordModel } from '../mappers/to-medical-record-model.mapper'
import { createMedicalRecordUseCase } from './create-medical-record.use-case'

describe('createMedicalRecordUseCase', () => {
  beforeEach(() => jest.clearAllMocks())

  it('maps input to DTO, calls service, maps response', async () => {
    const input = { appointmentId: 'appt-uuid', data: { k1: 'val' } }
    const mappedDto = { appointmentId: 'appt-uuid', data: { k1: 'val' } }
    const responseDto = { id: 'uuid-1' }
    const model = { id: 'uuid-1' }

    ;(toCreateMedicalRecordDto as jest.Mock).mockReturnValue(mappedDto)
    ;(medicalRecordsService.create as jest.Mock).mockResolvedValue(responseDto)
    ;(toMedicalRecordModel as jest.Mock).mockReturnValue(model)

    const result = await createMedicalRecordUseCase(input)

    expect(toCreateMedicalRecordDto).toHaveBeenCalledWith(input)
    expect(medicalRecordsService.create).toHaveBeenCalledWith(mappedDto)
    expect(toMedicalRecordModel).toHaveBeenCalledWith(responseDto)
    expect(result).toBe(model)
  })
})
