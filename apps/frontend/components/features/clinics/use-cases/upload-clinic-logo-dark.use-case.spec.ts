jest.mock('../services/clinics.service')
jest.mock('../mappers/to-clinic-model')

import { clinicsService } from '../services/clinics.service'
import { toClinicModel } from '../mappers/to-clinic-model'
import { uploadClinicLogoDarkUseCase } from './upload-clinic-logo-dark.use-case'

const mockClinicsService = clinicsService as jest.Mocked<typeof clinicsService>
const mockToClinicModel = toClinicModel as jest.Mock

const file = new File(['img'], 'logo-dark.png', { type: 'image/png' })
const dto = { id: 'uuid-1', name: 'Clínica' }
const model = { id: 'uuid-1', name: 'Clínica' }

describe('uploadClinicLogoDarkUseCase', () => {
  beforeEach(() => jest.clearAllMocks())

  it('calls uploadLogoDark when no clinicId is provided', async () => {
    mockClinicsService.uploadLogoDark.mockResolvedValue(dto as any)
    mockToClinicModel.mockReturnValue(model)

    const result = await uploadClinicLogoDarkUseCase(file)

    expect(mockClinicsService.uploadLogoDark).toHaveBeenCalledWith(file)
    expect(mockClinicsService.uploadLogoDarkById).not.toHaveBeenCalled()
    expect(result).toBe(model)
  })

  it('calls uploadLogoDarkById when clinicId is provided', async () => {
    mockClinicsService.uploadLogoDarkById.mockResolvedValue(dto as any)
    mockToClinicModel.mockReturnValue(model)

    const result = await uploadClinicLogoDarkUseCase(file, 'clinic-uuid')

    expect(mockClinicsService.uploadLogoDarkById).toHaveBeenCalledWith('clinic-uuid', file)
    expect(mockClinicsService.uploadLogoDark).not.toHaveBeenCalled()
    expect(result).toBe(model)
  })
})
