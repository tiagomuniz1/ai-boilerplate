jest.mock('../services/medical-records.service')
jest.mock('../mappers/to-medical-record-model.mapper')

import { medicalRecordsService } from '../services/medical-records.service'
import { toPaginatedMedicalRecordsModel } from '../mappers/to-medical-record-model.mapper'
import { listPatientMedicalHistoryUseCase } from './list-patient-medical-history.use-case'

describe('listPatientMedicalHistoryUseCase', () => {
  beforeEach(() => jest.clearAllMocks())

  it('fetches and maps paginated response', async () => {
    const raw = { data: [], total: 0, page: 1, limit: 20 }
    const mapped = { data: [], total: 0, page: 1, limit: 20 }
    ;(medicalRecordsService.listByPatient as jest.Mock).mockResolvedValue(raw)
    ;(toPaginatedMedicalRecordsModel as jest.Mock).mockReturnValue(mapped)

    const result = await listPatientMedicalHistoryUseCase('patient-uuid')

    expect(medicalRecordsService.listByPatient).toHaveBeenCalledWith('patient-uuid', undefined)
    expect(toPaginatedMedicalRecordsModel).toHaveBeenCalledWith(raw)
    expect(result).toBe(mapped)
  })

  it('passes params to service', async () => {
    ;(medicalRecordsService.listByPatient as jest.Mock).mockResolvedValue({ data: [], total: 0, page: 2, limit: 10 })
    ;(toPaginatedMedicalRecordsModel as jest.Mock).mockReturnValue({})

    await listPatientMedicalHistoryUseCase('patient-uuid', { page: 2, limit: 10 })
    expect(medicalRecordsService.listByPatient).toHaveBeenCalledWith('patient-uuid', { page: 2, limit: 10 })
  })
})
