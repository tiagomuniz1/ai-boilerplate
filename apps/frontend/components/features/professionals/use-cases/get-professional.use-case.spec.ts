jest.mock('../services/professionals.service')
jest.mock('../mappers/to-professional-model.mapper')

import { professionalsService } from '../services/professionals.service'
import { toProfessionalModel } from '../mappers/to-professional-model.mapper'
import { getProfessionalUseCase } from './get-professional.use-case'

const makeDto = () => ({
  id: 'uuid-1',
  user: { id: 'user-uuid-1', fullName: 'Dr. João', email: 'joao@example.com' },
  registrations: [{ id: 'crm-uuid-1', number: '12345', state: 'SP', isPrimary: true }],
  specialties: [{ id: 'spec-uuid-1', name: 'Cardiologia', registryNumber: null }],
  bio: null,
  createdAt: new Date(),
  updatedAt: new Date(),
})

describe('getProfessionalUseCase', () => {
  it('calls professionalsService.getById and returns mapped model', async () => {
    const dto = makeDto()
    const model = { ...dto }
    ;(professionalsService.getById as jest.Mock).mockResolvedValue(dto)
    ;(toProfessionalModel as jest.Mock).mockReturnValue(model)

    const result = await getProfessionalUseCase('uuid-1')

    expect(professionalsService.getById).toHaveBeenCalledWith('uuid-1')
    expect(toProfessionalModel).toHaveBeenCalledWith(dto)
    expect(result).toBe(model)
  })

  it('propagates errors from professionalsService.getById', async () => {
    const error = { status: 404, title: 'Not Found', detail: 'Professional not found' }
    ;(professionalsService.getById as jest.Mock).mockRejectedValue(error)

    await expect(getProfessionalUseCase('uuid-1')).rejects.toEqual(error)
  })
})
