jest.mock('../services/clinics.service')
jest.mock('../mappers/to-clinic-model')

import { clinicsService } from '../services/clinics.service'
import { toClinicModel } from '../mappers/to-clinic-model'
import { getClinicBySlugUseCase } from './get-clinic-by-slug.use-case'

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

describe('getClinicBySlugUseCase', () => {
  it('calls clinicsService.getBySlug with the provided slug and returns mapped model', async () => {
    const dto = makeDto()
    const model = makeModel()
    ;(clinicsService.getBySlug as jest.Mock).mockResolvedValue(dto)
    ;(toClinicModel as jest.Mock).mockReturnValue(model)

    const result = await getClinicBySlugUseCase('clinica-do-coracao')

    expect(clinicsService.getBySlug).toHaveBeenCalledWith('clinica-do-coracao')
    const [firstArg] = (toClinicModel as jest.Mock).mock.calls[0]
    expect(firstArg).toEqual(dto)
    expect(result).toEqual(model)
  })

  it('propagates errors from clinicsService.getBySlug', async () => {
    const error = { status: 404, title: 'Not Found', detail: 'Clinic not found' }
    ;(clinicsService.getBySlug as jest.Mock).mockRejectedValue(error)

    await expect(getClinicBySlugUseCase('slug-inexistente')).rejects.toEqual(error)
  })
})
