jest.mock('../services/doctors.service')
jest.mock('../mappers/to-doctor-model.mapper')
jest.mock('../mappers/to-update-doctor-dto.mapper')

import { doctorsService } from '../services/doctors.service'
import { toDoctorModel } from '../mappers/to-doctor-model.mapper'
import { toUpdateDoctorDto } from '../mappers/to-update-doctor-dto.mapper'
import { updateDoctorUseCase } from './update-doctor.use-case'

const input = { specialtyIds: ['spec-uuid-2'] }

const makeDto = () => ({
  id: 'uuid-1',
  user: { id: 'user-uuid-1', fullName: 'Dr. João', email: 'joao@example.com' },
  crmNumber: '12345/SP',
  specialties: [{ id: 'spec-uuid-2', name: 'Neurologia' }],
  bio: null,
  createdAt: new Date(),
  updatedAt: new Date(),
})

describe('updateDoctorUseCase', () => {
  it('maps input to DTO, calls doctorsService.update and returns mapped model', async () => {
    const dto = makeDto()
    const mappedDto = { ...input }
    const model = { ...dto }
    ;(toUpdateDoctorDto as jest.Mock).mockReturnValue(mappedDto)
    ;(doctorsService.update as jest.Mock).mockResolvedValue(dto)
    ;(toDoctorModel as jest.Mock).mockReturnValue(model)

    const result = await updateDoctorUseCase('uuid-1', input)

    expect(toUpdateDoctorDto).toHaveBeenCalledWith(input)
    expect(doctorsService.update).toHaveBeenCalledWith('uuid-1', mappedDto)
    expect(toDoctorModel).toHaveBeenCalledWith(dto)
    expect(result).toBe(model)
  })

  it('propagates errors from doctorsService.update', async () => {
    const error = { status: 409, title: 'Conflict', detail: 'CRM already in use' }
    ;(toUpdateDoctorDto as jest.Mock).mockReturnValue(input)
    ;(doctorsService.update as jest.Mock).mockRejectedValue(error)

    await expect(updateDoctorUseCase('uuid-1', input)).rejects.toEqual(error)
  })
})
