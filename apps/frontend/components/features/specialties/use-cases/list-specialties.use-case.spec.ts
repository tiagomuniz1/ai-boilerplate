jest.mock('../services/specialties.service')
jest.mock('../mappers/to-specialty-model.mapper')

import { specialtiesService } from '../services/specialties.service'
import { toSpecialtyModel } from '../mappers/to-specialty-model.mapper'
import { listSpecialtiesUseCase } from './list-specialties.use-case'

const makeDto = () => ({
  id: 'uuid-1',
  name: 'Cardiologia',
  description: null,
  createdAt: new Date(),
  updatedAt: new Date(),
})

const makeModel = () => ({
  id: 'uuid-1',
  name: 'Cardiologia',
  description: null,
  createdAt: new Date(),
  updatedAt: new Date(),
})

describe('listSpecialtiesUseCase', () => {
  it('calls specialtiesService.getAll, maps each dto and returns paginated model', async () => {
    const dtos = [makeDto()]
    const model = makeModel()
    ;(specialtiesService.getAll as jest.Mock).mockResolvedValue({ data: dtos, total: 1, page: 1, limit: 20 })
    ;(toSpecialtyModel as jest.Mock).mockReturnValue(model)

    const result = await listSpecialtiesUseCase()

    expect(specialtiesService.getAll).toHaveBeenCalledWith(undefined)
    const [firstArg] = (toSpecialtyModel as jest.Mock).mock.calls[0]
    expect(firstArg).toEqual(dtos[0])
    expect(result.data).toEqual([model])
    expect(result.total).toBe(1)
    expect(result.page).toBe(1)
    expect(result.limit).toBe(20)
  })

  it('passes params to specialtiesService.getAll', async () => {
    const params = { search: 'Cardio', page: 2, limit: 10 }
    ;(specialtiesService.getAll as jest.Mock).mockResolvedValue({ data: [], total: 0, page: 2, limit: 10 })

    await listSpecialtiesUseCase(params)

    expect(specialtiesService.getAll).toHaveBeenCalledWith(params)
  })

  it('propagates errors from specialtiesService.getAll', async () => {
    const error = { status: 500, title: 'Internal Error', detail: 'Server error' }
    ;(specialtiesService.getAll as jest.Mock).mockRejectedValue(error)

    await expect(listSpecialtiesUseCase()).rejects.toEqual(error)
  })
})
