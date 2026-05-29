jest.mock('../services/specialties.service')
jest.mock('../mappers/to-specialty-model.mapper')
jest.mock('../mappers/to-create-specialty-dto.mapper')

import { specialtiesService } from '../services/specialties.service'
import { toSpecialtyModel } from '../mappers/to-specialty-model.mapper'
import { toCreateSpecialtyDto } from '../mappers/to-create-specialty-dto.mapper'
import { createSpecialtyUseCase } from './create-specialty.use-case'

const input = { name: 'Cardiologia' }

const makeDto = () => ({
  id: 'uuid-1',
  name: 'Cardiologia',
  description: null,
  createdAt: new Date(),
  updatedAt: new Date(),
})

describe('createSpecialtyUseCase', () => {
  it('maps input to DTO, calls specialtiesService.create and returns mapped model', async () => {
    const dto = makeDto()
    const mappedDto = { ...input }
    const model = { ...dto }
    ;(toCreateSpecialtyDto as jest.Mock).mockReturnValue(mappedDto)
    ;(specialtiesService.create as jest.Mock).mockResolvedValue(dto)
    ;(toSpecialtyModel as jest.Mock).mockReturnValue(model)

    const result = await createSpecialtyUseCase(input)

    expect(toCreateSpecialtyDto).toHaveBeenCalledWith(input)
    expect(specialtiesService.create).toHaveBeenCalledWith(mappedDto)
    expect(toSpecialtyModel).toHaveBeenCalledWith(dto)
    expect(result).toBe(model)
  })

  it('propagates errors from specialtiesService.create', async () => {
    const error = { status: 409, title: 'Conflict', detail: 'Specialty name already in use' }
    ;(toCreateSpecialtyDto as jest.Mock).mockReturnValue(input)
    ;(specialtiesService.create as jest.Mock).mockRejectedValue(error)

    await expect(createSpecialtyUseCase(input)).rejects.toEqual(error)
  })
})
