jest.mock('../services/professionals.service')
jest.mock('../mappers/to-professional-model.mapper')
jest.mock('../mappers/to-create-professional-dto.mapper')

import { professionalsService } from '../services/professionals.service'
import { toProfessionalModel } from '../mappers/to-professional-model.mapper'
import { toCreateProfessionalDto } from '../mappers/to-create-professional-dto.mapper'
import { createProfessionalUseCase } from './create-professional.use-case'

const input = {
  userId: 'user-uuid-1',
  registrations: [{ id: 'crm-uuid-1', number: '12345', state: 'SP', isPrimary: true }],
  specialties: [{ specialtyId: 'spec-uuid-1' }],
}

const makeDto = () => ({
  id: 'uuid-1',
  user: { id: 'user-uuid-1', fullName: 'Dr. João', email: 'joao@example.com' },
  registrations: [{ id: 'crm-uuid-1', number: '12345', state: 'SP', isPrimary: true }],
  specialties: [{ id: 'spec-uuid-1', name: 'Cardiologia', registryNumber: null }],
  bio: null,
  createdAt: new Date(),
  updatedAt: new Date(),
})

describe('createProfessionalUseCase', () => {
  it('maps input to DTO, calls professionalsService.create and returns mapped model', async () => {
    const dto = makeDto()
    const mappedDto = { ...input }
    const model = { ...dto }
    ;(toCreateProfessionalDto as jest.Mock).mockReturnValue(mappedDto)
    ;(professionalsService.create as jest.Mock).mockResolvedValue(dto)
    ;(toProfessionalModel as jest.Mock).mockReturnValue(model)

    const result = await createProfessionalUseCase(input)

    expect(toCreateProfessionalDto).toHaveBeenCalledWith(input)
    expect(professionalsService.create).toHaveBeenCalledWith(mappedDto)
    expect(toProfessionalModel).toHaveBeenCalledWith(dto)
    expect(result).toBe(model)
  })

  it('propagates errors from professionalsService.create', async () => {
    const error = { status: 409, title: 'Conflict', detail: 'CRM already in use' }
    ;(toCreateProfessionalDto as jest.Mock).mockReturnValue(input)
    ;(professionalsService.create as jest.Mock).mockRejectedValue(error)

    await expect(createProfessionalUseCase(input)).rejects.toEqual(error)
  })
})
