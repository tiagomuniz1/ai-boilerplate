jest.mock('../services/clinics.service')
jest.mock('../mappers/to-clinic-model')

import { clinicsService } from '../services/clinics.service'
import { toClinicModel } from '../mappers/to-clinic-model'
import { listClinicsUseCase } from './list-clinics.use-case'

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

describe('listClinicsUseCase', () => {
  it('calls clinicsService.getAll, maps each dto and returns paginated result', async () => {
    const dto = makeDto()
    const model = makeModel()
    ;(clinicsService.getAll as jest.Mock).mockResolvedValue({ data: [dto], total: 1, page: 1, limit: 20 })
    ;(toClinicModel as jest.Mock).mockReturnValue(model)

    const result = await listClinicsUseCase()

    expect(clinicsService.getAll).toHaveBeenCalledWith(undefined)
    const [firstArg] = (toClinicModel as jest.Mock).mock.calls[0]
    expect(firstArg).toEqual(dto)
    expect(result).toEqual({ data: [model], total: 1, page: 1, limit: 20 })
  })

  it('passes params to clinicsService.getAll', async () => {
    const params = { search: 'coracao', page: 2, limit: 10 }
    ;(clinicsService.getAll as jest.Mock).mockResolvedValue({ data: [], total: 0, page: 2, limit: 10 })

    await listClinicsUseCase(params)

    expect(clinicsService.getAll).toHaveBeenCalledWith(params)
  })

  it('returns correct pagination metadata', async () => {
    ;(clinicsService.getAll as jest.Mock).mockResolvedValue({ data: [], total: 42, page: 3, limit: 10 })

    const result = await listClinicsUseCase()

    expect(result.total).toBe(42)
    expect(result.page).toBe(3)
    expect(result.limit).toBe(10)
  })

  it('propagates errors from clinicsService.getAll', async () => {
    const error = { status: 500, title: 'Internal Error', detail: 'Server error' }
    ;(clinicsService.getAll as jest.Mock).mockRejectedValue(error)

    await expect(listClinicsUseCase()).rejects.toEqual(error)
  })
})
