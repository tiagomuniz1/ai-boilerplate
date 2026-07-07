jest.mock('../services/doctors.service')
jest.mock('../mappers/to-doctor-model.mapper')

import { doctorsService } from '../services/doctors.service'
import { toDoctorModel } from '../mappers/to-doctor-model.mapper'
import { getDoctorUseCase } from './get-doctor.use-case'

const makeDto = () => ({
  id: 'uuid-1',
  user: { id: 'user-uuid-1', fullName: 'Dr. João', email: 'joao@example.com' },
  crms: [{ id: 'crm-uuid-1', number: '12345', state: 'SP', isPrimary: true }],
  specialties: [{ id: 'spec-uuid-1', name: 'Cardiologia', rqe: null }],
  bio: null,
  createdAt: new Date(),
  updatedAt: new Date(),
})

describe('getDoctorUseCase', () => {
  it('calls doctorsService.getById and returns mapped model', async () => {
    const dto = makeDto()
    const model = { ...dto }
    ;(doctorsService.getById as jest.Mock).mockResolvedValue(dto)
    ;(toDoctorModel as jest.Mock).mockReturnValue(model)

    const result = await getDoctorUseCase('uuid-1')

    expect(doctorsService.getById).toHaveBeenCalledWith('uuid-1')
    expect(toDoctorModel).toHaveBeenCalledWith(dto)
    expect(result).toBe(model)
  })

  it('propagates errors from doctorsService.getById', async () => {
    const error = { status: 404, title: 'Not Found', detail: 'Doctor not found' }
    ;(doctorsService.getById as jest.Mock).mockRejectedValue(error)

    await expect(getDoctorUseCase('uuid-1')).rejects.toEqual(error)
  })
})
