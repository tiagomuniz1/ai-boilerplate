jest.mock('../services/specialties.service')
jest.mock('../mappers/to-specialty-model.mapper')
jest.mock('../mappers/to-update-specialty-dto.mapper')

import { specialtiesService } from '../services/specialties.service'
import { toSpecialtyModel } from '../mappers/to-specialty-model.mapper'
import { toUpdateSpecialtyDto } from '../mappers/to-update-specialty-dto.mapper'
import { updateSpecialtyUseCase } from './update-specialty.use-case'

const input = { name: 'Neurologia' }

const makeDto = () => ({
  id: 'uuid-1',
  name: 'Neurologia',
  description: null,
  createdAt: new Date(),
  updatedAt: new Date(),
})

describe('updateSpecialtyUseCase', () => {
  it('maps input to DTO, calls specialtiesService.update and returns mapped model', async () => {
    const dto = makeDto()
    const mappedDto = { ...input }
    const model = { ...dto }
    ;(toUpdateSpecialtyDto as jest.Mock).mockReturnValue(mappedDto)
    ;(specialtiesService.update as jest.Mock).mockResolvedValue(dto)
    ;(toSpecialtyModel as jest.Mock).mockReturnValue(model)

    const result = await updateSpecialtyUseCase('uuid-1', input)

    expect(toUpdateSpecialtyDto).toHaveBeenCalledWith(input)
    expect(specialtiesService.update).toHaveBeenCalledWith('uuid-1', mappedDto)
    expect(toSpecialtyModel).toHaveBeenCalledWith(dto)
    expect(result).toBe(model)
  })

  it('propagates errors from specialtiesService.update', async () => {
    const error = { status: 409, title: 'Conflict', detail: 'Specialty name already in use' }
    ;(toUpdateSpecialtyDto as jest.Mock).mockReturnValue(input)
    ;(specialtiesService.update as jest.Mock).mockRejectedValue(error)

    await expect(updateSpecialtyUseCase('uuid-1', input)).rejects.toEqual(error)
  })
})
