jest.mock('../services/clinics.service')
jest.mock('../mappers/to-clinic-model')

import { clinicsService } from '../services/clinics.service'
import { toClinicModel } from '../mappers/to-clinic-model'
import { getClinicUseCase } from './get-clinic.use-case'

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

describe('getClinicUseCase', () => {
  it('calls clinicsService.getById with the given id and returns mapped model', async () => {
    const dto = makeDto()
    const model = makeModel()
    ;(clinicsService.getById as jest.Mock).mockResolvedValue(dto)
    ;(toClinicModel as jest.Mock).mockReturnValue(model)

    const result = await getClinicUseCase('uuid-1')

    expect(clinicsService.getById).toHaveBeenCalledWith('uuid-1')
    const [firstArg] = (toClinicModel as jest.Mock).mock.calls[0]
    expect(firstArg).toEqual(dto)
    expect(result).toEqual(model)
  })

  it('propagates errors from clinicsService.getById', async () => {
    const error = { status: 404, title: 'Not Found', detail: 'Clinic not found' }
    ;(clinicsService.getById as jest.Mock).mockRejectedValue(error)

    await expect(getClinicUseCase('uuid-1')).rejects.toEqual(error)
  })
})
