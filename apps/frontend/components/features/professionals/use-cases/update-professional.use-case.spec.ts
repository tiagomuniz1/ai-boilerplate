jest.mock('../services/professionals.service')
jest.mock('../mappers/to-professional-model.mapper')
jest.mock('../mappers/to-update-professional-dto.mapper')

import { professionalsService } from '../services/professionals.service'
import { toProfessionalModel } from '../mappers/to-professional-model.mapper'
import { toUpdateProfessionalDto } from '../mappers/to-update-professional-dto.mapper'
import { updateProfessionalUseCase } from './update-professional.use-case'

const input = { specialties: [{ specialtyId: 'spec-uuid-2' }] }

const makeDto = () => ({
  id: 'uuid-1',
  user: { id: 'user-uuid-1', fullName: 'Dr. João', email: 'joao@example.com' },
  registrations: [{ id: 'crm-uuid-1', number: '12345', state: 'SP', isPrimary: true }],
  specialties: [{ id: 'spec-uuid-2', name: 'Neurologia', registryNumber: null }],
  bio: null,
  createdAt: new Date(),
  updatedAt: new Date(),
})

describe('updateProfessionalUseCase', () => {
  it('maps input to DTO, calls professionalsService.update and returns mapped model', async () => {
    const dto = makeDto()
    const mappedDto = { ...input }
    const model = { ...dto }
    ;(toUpdateProfessionalDto as jest.Mock).mockReturnValue(mappedDto)
    ;(professionalsService.update as jest.Mock).mockResolvedValue(dto)
    ;(toProfessionalModel as jest.Mock).mockReturnValue(model)

    const result = await updateProfessionalUseCase('uuid-1', input)

    expect(toUpdateProfessionalDto).toHaveBeenCalledWith(input)
    expect(professionalsService.update).toHaveBeenCalledWith('uuid-1', mappedDto)
    expect(toProfessionalModel).toHaveBeenCalledWith(dto)
    expect(result).toBe(model)
  })

  it('propagates errors from professionalsService.update', async () => {
    const error = { status: 409, title: 'Conflict', detail: 'CRM already in use' }
    ;(toUpdateProfessionalDto as jest.Mock).mockReturnValue(input)
    ;(professionalsService.update as jest.Mock).mockRejectedValue(error)

    await expect(updateProfessionalUseCase('uuid-1', input)).rejects.toEqual(error)
  })
})
