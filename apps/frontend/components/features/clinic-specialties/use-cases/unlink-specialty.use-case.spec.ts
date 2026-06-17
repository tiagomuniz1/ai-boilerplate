jest.mock('../services/clinic-specialties.service')

import { unlinkSpecialtyUseCase } from './unlink-specialty.use-case'
import { clinicSpecialtiesService } from '../services/clinic-specialties.service'

const mockService = clinicSpecialtiesService as jest.Mocked<typeof clinicSpecialtiesService>

const CLINIC_ID = 'clinic-uuid-1'
const SPECIALTY_ID = 'specialty-uuid-1'

describe('unlinkSpecialtyUseCase', () => {
  beforeEach(() => jest.clearAllMocks())

  it('calls service unlink with correct params', async () => {
    mockService.unlink.mockResolvedValue(undefined)

    await unlinkSpecialtyUseCase(CLINIC_ID, SPECIALTY_ID)

    expect(mockService.unlink).toHaveBeenCalledWith(CLINIC_ID, SPECIALTY_ID)
  })
})
