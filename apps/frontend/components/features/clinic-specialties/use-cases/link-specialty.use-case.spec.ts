jest.mock('../services/clinic-specialties.service')
jest.mock('../mappers/to-clinic-specialty-model.mapper')

import { linkSpecialtyUseCase } from './link-specialty.use-case'
import { clinicSpecialtiesService } from '../services/clinic-specialties.service'
import { toClinicSpecialtyModel } from '../mappers/to-clinic-specialty-model.mapper'

const mockService = clinicSpecialtiesService as jest.Mocked<typeof clinicSpecialtiesService>
const mockMapper = toClinicSpecialtyModel as jest.MockedFunction<typeof toClinicSpecialtyModel>

const CLINIC_ID = 'clinic-uuid-1'
const SPECIALTY_ID = 'specialty-uuid-1'

const makeDto = () => ({
  id: 'link-uuid-1',
  clinicId: CLINIC_ID,
  specialtyId: SPECIALTY_ID,
  name: 'Cardiologia',
  description: null,
  linkedAt: new Date('2024-01-15T10:00:00.000Z'),
})

const makeModel = () => ({
  id: 'link-uuid-1',
  clinicId: CLINIC_ID,
  specialtyId: SPECIALTY_ID,
  name: 'Cardiologia',
  description: null,
  linkedAt: new Date('2024-01-15T10:00:00.000Z'),
})

describe('linkSpecialtyUseCase', () => {
  beforeEach(() => jest.clearAllMocks())

  it('calls service link and maps the result', async () => {
    const dto = makeDto()
    const model = makeModel()
    mockService.link.mockResolvedValue(dto)
    mockMapper.mockReturnValue(model)

    const result = await linkSpecialtyUseCase(CLINIC_ID, SPECIALTY_ID)

    expect(mockService.link).toHaveBeenCalledWith(CLINIC_ID, SPECIALTY_ID)
    expect(mockMapper).toHaveBeenCalledWith(dto)
    expect(result).toBe(model)
  })
})
