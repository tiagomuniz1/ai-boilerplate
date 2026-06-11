jest.mock('../services/clinics.service')
jest.mock('../mappers/to-clinic-model')

import { clinicsService } from '../services/clinics.service'
import { toClinicModel } from '../mappers/to-clinic-model'
import { getCurrentClinicUseCase } from './get-current-clinic.use-case'

const makeDto = () => ({
  id: 'uuid-1',
  name: 'Clínica do Coração',
  slug: 'clinica-do-coracao',
  isActive: true,
  createdAt: new Date('2024-01-15'),
  updatedAt: new Date('2024-01-16'),
})

const makeModel = () => ({
  id: 'uuid-1',
  name: 'Clínica do Coração',
  slug: 'clinica-do-coracao',
  isActive: true,
  createdAt: new Date('2024-01-15'),
  updatedAt: new Date('2024-01-16'),
})

describe('getCurrentClinicUseCase', () => {
  it('calls clinicsService.getMe and returns mapped model', async () => {
    const dto = makeDto()
    const model = makeModel()
    ;(clinicsService.getMe as jest.Mock).mockResolvedValue(dto)
    ;(toClinicModel as jest.Mock).mockReturnValue(model)

    const result = await getCurrentClinicUseCase()

    expect(clinicsService.getMe).toHaveBeenCalledTimes(1)
    const [firstArg] = (toClinicModel as jest.Mock).mock.calls[0]
    expect(firstArg).toEqual(dto)
    expect(result).toEqual(model)
  })

  it('propagates errors from clinicsService.getMe', async () => {
    const error = { status: 401, title: 'Unauthorized', detail: 'No clinic associated' }
    ;(clinicsService.getMe as jest.Mock).mockRejectedValue(error)

    await expect(getCurrentClinicUseCase()).rejects.toEqual(error)
  })
})
