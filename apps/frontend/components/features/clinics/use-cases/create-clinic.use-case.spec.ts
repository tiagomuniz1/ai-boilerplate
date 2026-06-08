jest.mock('../services/clinics.service')
jest.mock('../mappers/to-clinic-model')

import { clinicsService } from '../services/clinics.service'
import { toClinicModel } from '../mappers/to-clinic-model'
import { createClinicUseCase } from './create-clinic.use-case'

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

describe('createClinicUseCase', () => {
  it('calls clinicsService.create with input and returns mapped model', async () => {
    const dto = makeDto()
    const model = makeModel()
    const input = { name: 'Clínica do Coração', slug: 'clinica-do-coracao' }
    ;(clinicsService.create as jest.Mock).mockResolvedValue(dto)
    ;(toClinicModel as jest.Mock).mockReturnValue(model)

    const result = await createClinicUseCase(input)

    expect(clinicsService.create).toHaveBeenCalledWith(input)
    const [firstArg] = (toClinicModel as jest.Mock).mock.calls[0]
    expect(firstArg).toEqual(dto)
    expect(result).toEqual(model)
  })

  it('calls clinicsService.create without slug when slug is undefined', async () => {
    const dto = makeDto()
    const model = makeModel()
    const input = { name: 'Clínica do Coração' }
    ;(clinicsService.create as jest.Mock).mockResolvedValue(dto)
    ;(toClinicModel as jest.Mock).mockReturnValue(model)

    await createClinicUseCase(input)

    expect(clinicsService.create).toHaveBeenCalledWith(input)
  })

  it('propagates errors from clinicsService.create', async () => {
    const error = { status: 409, title: 'Conflict', detail: 'Slug already in use' }
    ;(clinicsService.create as jest.Mock).mockRejectedValue(error)

    await expect(createClinicUseCase({ name: 'Clínica' })).rejects.toEqual(error)
  })
})
