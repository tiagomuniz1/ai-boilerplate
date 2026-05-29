jest.mock('../services/specialties.service')
jest.mock('../mappers/to-specialty-model.mapper')

import { specialtiesService } from '../services/specialties.service'
import { toSpecialtyModel } from '../mappers/to-specialty-model.mapper'
import { getSpecialtyUseCase } from './get-specialty.use-case'

const makeDto = () => ({
  id: 'uuid-1',
  name: 'Cardiologia',
  description: null,
  createdAt: new Date(),
  updatedAt: new Date(),
})

describe('getSpecialtyUseCase', () => {
  it('calls specialtiesService.getById and returns mapped model', async () => {
    const dto = makeDto()
    const model = { ...dto }
    ;(specialtiesService.getById as jest.Mock).mockResolvedValue(dto)
    ;(toSpecialtyModel as jest.Mock).mockReturnValue(model)

    const result = await getSpecialtyUseCase('uuid-1')

    expect(specialtiesService.getById).toHaveBeenCalledWith('uuid-1')
    expect(toSpecialtyModel).toHaveBeenCalledWith(dto)
    expect(result).toBe(model)
  })

  it('propagates errors from specialtiesService.getById', async () => {
    const error = { status: 404, title: 'Not Found', detail: 'Specialty not found' }
    ;(specialtiesService.getById as jest.Mock).mockRejectedValue(error)

    await expect(getSpecialtyUseCase('uuid-1')).rejects.toEqual(error)
  })
})
