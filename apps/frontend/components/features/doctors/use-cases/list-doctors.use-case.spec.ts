jest.mock('../services/doctors.service')
jest.mock('../mappers/to-doctor-model.mapper')

import { doctorsService } from '../services/doctors.service'
import { toDoctorModel } from '../mappers/to-doctor-model.mapper'
import { listDoctorsUseCase } from './list-doctors.use-case'

const makeDto = () => ({
  id: 'uuid-1',
  user: { id: 'user-uuid-1', fullName: 'Dr. João', email: 'joao@example.com' },
  crmNumber: '12345/SP',
  specialties: [{ id: 'spec-uuid-1', name: 'Cardiologia' }],
  bio: null,
  createdAt: new Date(),
  updatedAt: new Date(),
})

const makeModel = () => ({
  id: 'uuid-1',
  user: { id: 'user-uuid-1', fullName: 'Dr. João', email: 'joao@example.com' },
  crmNumber: '12345/SP',
  specialties: [{ id: 'spec-uuid-1', name: 'Cardiologia' }],
  bio: null,
  createdAt: new Date(),
  updatedAt: new Date(),
})

describe('listDoctorsUseCase', () => {
  it('calls doctorsService.getAll, maps each dto and returns models', async () => {
    const dtos = [makeDto()]
    const model = makeModel()
    ;(doctorsService.getAll as jest.Mock).mockResolvedValue({ data: dtos, total: 1, page: 1, limit: 20 })
    ;(toDoctorModel as jest.Mock).mockReturnValue(model)

    const result = await listDoctorsUseCase()

    expect(doctorsService.getAll).toHaveBeenCalledWith(undefined)
    const [firstArg] = (toDoctorModel as jest.Mock).mock.calls[0]
    expect(firstArg).toEqual(dtos[0])
    expect(result).toEqual([model])
  })

  it('passes params to doctorsService.getAll', async () => {
    const params = { search: 'Cardio', page: 2, limit: 10 }
    ;(doctorsService.getAll as jest.Mock).mockResolvedValue({ data: [], total: 0, page: 2, limit: 10 })

    await listDoctorsUseCase(params)

    expect(doctorsService.getAll).toHaveBeenCalledWith(params)
  })

  it('propagates errors from doctorsService.getAll', async () => {
    const error = { status: 500, title: 'Internal Error', detail: 'Server error' }
    ;(doctorsService.getAll as jest.Mock).mockRejectedValue(error)

    await expect(listDoctorsUseCase()).rejects.toEqual(error)
  })
})
