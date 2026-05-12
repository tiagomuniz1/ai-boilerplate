jest.mock('../services/doctors.service')
jest.mock('../mappers/to-doctor-model.mapper')
jest.mock('../mappers/to-create-doctor-dto.mapper')

import { doctorsService } from '../services/doctors.service'
import { toDoctorModel } from '../mappers/to-doctor-model.mapper'
import { toCreateDoctorDto } from '../mappers/to-create-doctor-dto.mapper'
import { createDoctorUseCase } from './create-doctor.use-case'

const input = {
  userId: 'user-uuid-1',
  crmNumber: '12345/SP',
  specialty: 'Cardiologia',
}

const makeDto = () => ({
  id: 'uuid-1',
  user: { id: 'user-uuid-1', fullName: 'Dr. João', email: 'joao@example.com' },
  crmNumber: '12345/SP',
  specialty: 'Cardiologia',
  bio: null,
  createdAt: new Date(),
  updatedAt: new Date(),
})

describe('createDoctorUseCase', () => {
  it('maps input to DTO, calls doctorsService.create and returns mapped model', async () => {
    const dto = makeDto()
    const mappedDto = { ...input }
    const model = { ...dto }
    ;(toCreateDoctorDto as jest.Mock).mockReturnValue(mappedDto)
    ;(doctorsService.create as jest.Mock).mockResolvedValue(dto)
    ;(toDoctorModel as jest.Mock).mockReturnValue(model)

    const result = await createDoctorUseCase(input)

    expect(toCreateDoctorDto).toHaveBeenCalledWith(input)
    expect(doctorsService.create).toHaveBeenCalledWith(mappedDto)
    expect(toDoctorModel).toHaveBeenCalledWith(dto)
    expect(result).toBe(model)
  })

  it('propagates errors from doctorsService.create', async () => {
    const error = { status: 409, title: 'Conflict', detail: 'CRM already in use' }
    ;(toCreateDoctorDto as jest.Mock).mockReturnValue(input)
    ;(doctorsService.create as jest.Mock).mockRejectedValue(error)

    await expect(createDoctorUseCase(input)).rejects.toEqual(error)
  })
})
