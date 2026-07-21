jest.mock('../services/professionals.service')
jest.mock('../mappers/to-professional-model.mapper')

import { professionalsService } from '../services/professionals.service'
import { toProfessionalModel } from '../mappers/to-professional-model.mapper'
import { listProfessionalsUseCase } from './list-professionals.use-case'

const makeDto = () => ({
  id: 'uuid-1',
  user: { id: 'user-uuid-1', fullName: 'Dr. João', email: 'joao@example.com' },
  registrations: [{ id: 'crm-uuid-1', number: '12345', state: 'SP', isPrimary: true }],
  specialties: [{ id: 'spec-uuid-1', name: 'Cardiologia', registryNumber: null }],
  bio: null,
  createdAt: new Date(),
  updatedAt: new Date(),
})

const makeModel = () => ({
  id: 'uuid-1',
  user: { id: 'user-uuid-1', fullName: 'Dr. João', email: 'joao@example.com' },
  registrations: [{ id: 'crm-uuid-1', number: '12345', state: 'SP', isPrimary: true }],
  specialties: [{ id: 'spec-uuid-1', name: 'Cardiologia', registryNumber: null }],
  bio: null,
  createdAt: new Date(),
  updatedAt: new Date(),
})

describe('listProfessionalsUseCase', () => {
  it('calls professionalsService.getAll, maps each dto and returns models', async () => {
    const dtos = [makeDto()]
    const model = makeModel()
    ;(professionalsService.getAll as jest.Mock).mockResolvedValue({ data: dtos, total: 1, page: 1, limit: 20 })
    ;(toProfessionalModel as jest.Mock).mockReturnValue(model)

    const result = await listProfessionalsUseCase()

    expect(professionalsService.getAll).toHaveBeenCalledWith(undefined)
    const [firstArg] = (toProfessionalModel as jest.Mock).mock.calls[0]
    expect(firstArg).toEqual(dtos[0])
    expect(result).toEqual([model])
  })

  it('passes params to professionalsService.getAll', async () => {
    const params = { search: 'Cardio', page: 2, limit: 10 }
    ;(professionalsService.getAll as jest.Mock).mockResolvedValue({ data: [], total: 0, page: 2, limit: 10 })

    await listProfessionalsUseCase(params)

    expect(professionalsService.getAll).toHaveBeenCalledWith(params)
  })

  it('propagates errors from professionalsService.getAll', async () => {
    const error = { status: 500, title: 'Internal Error', detail: 'Server error' }
    ;(professionalsService.getAll as jest.Mock).mockRejectedValue(error)

    await expect(listProfessionalsUseCase()).rejects.toEqual(error)
  })
})
