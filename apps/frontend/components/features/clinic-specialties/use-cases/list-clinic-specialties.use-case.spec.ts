jest.mock('../services/clinic-specialties.service')
jest.mock('../mappers/to-clinic-specialty-model.mapper')

import { listClinicSpecialtiesUseCase } from './list-clinic-specialties.use-case'
import { clinicSpecialtiesService } from '../services/clinic-specialties.service'
import { toClinicSpecialtyModel } from '../mappers/to-clinic-specialty-model.mapper'

const mockService = clinicSpecialtiesService as jest.Mocked<typeof clinicSpecialtiesService>
const mockMapper = toClinicSpecialtyModel as jest.MockedFunction<typeof toClinicSpecialtyModel>

const CLINIC_ID = 'clinic-uuid-1'

const makeDto = () => ({
  id: 'link-uuid-1',
  clinicId: CLINIC_ID,
  specialtyId: 'specialty-uuid-1',
  name: 'Cardiologia',
  description: null,
  linkedAt: new Date('2024-01-15T10:00:00.000Z'),
})

const makeModel = () => ({
  id: 'link-uuid-1',
  clinicId: CLINIC_ID,
  specialtyId: 'specialty-uuid-1',
  name: 'Cardiologia',
  description: null,
  linkedAt: new Date('2024-01-15T10:00:00.000Z'),
})

describe('listClinicSpecialtiesUseCase', () => {
  beforeEach(() => jest.clearAllMocks())

  it('calls service and maps each item', async () => {
    const dto = makeDto()
    const model = makeModel()
    mockService.getAll.mockResolvedValue({ data: [dto], total: 1, page: 1, limit: 20 })
    mockMapper.mockReturnValue(model)

    const result = await listClinicSpecialtiesUseCase(CLINIC_ID)

    expect(mockService.getAll).toHaveBeenCalledWith(CLINIC_ID, undefined)
    expect(mockMapper).toHaveBeenCalledWith(dto)
    expect(result).toEqual({ data: [model], total: 1, page: 1, limit: 20 })
  })

  it('passes params to service', async () => {
    mockService.getAll.mockResolvedValue({ data: [], total: 0, page: 2, limit: 10 })

    await listClinicSpecialtiesUseCase(CLINIC_ID, { page: 2, limit: 10, search: 'Cardio' })

    expect(mockService.getAll).toHaveBeenCalledWith(CLINIC_ID, { page: 2, limit: 10, search: 'Cardio' })
  })

  it('returns empty data array when service returns empty', async () => {
    mockService.getAll.mockResolvedValue({ data: [], total: 0, page: 1, limit: 20 })

    const result = await listClinicSpecialtiesUseCase(CLINIC_ID)

    expect(result.data).toEqual([])
    expect(result.total).toBe(0)
  })
})
