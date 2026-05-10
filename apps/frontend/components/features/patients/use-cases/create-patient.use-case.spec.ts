jest.mock('../services/patients.service')
jest.mock('../mappers/to-patient-model.mapper')
jest.mock('../mappers/to-create-patient-dto.mapper')

import { PatientGender } from '@app/shared'
import { patientsService } from '../services/patients.service'
import { toPatientModel } from '../mappers/to-patient-model.mapper'
import { toCreatePatientDto } from '../mappers/to-create-patient-dto.mapper'
import { createPatientUseCase } from './create-patient.use-case'

describe('createPatientUseCase', () => {
  const input = {
    fullName: 'João Silva',
    email: 'joao@example.com',
    phoneNumber: '(11) 99999-9999',
    birthDate: '1990-05-15',
    documentNumber: '12345678901',
    gender: PatientGender.MALE,
  }
  const mappedDto = { ...input }
  const returnedDto = { id: 'uuid-1', ...input, createdAt: new Date(), updatedAt: new Date() }
  const model = { id: 'uuid-1', ...input, birthDate: new Date('1990-05-15'), createdAt: new Date(), updatedAt: new Date() }

  it('maps input to dto, calls patientsService.create and returns mapped model', async () => {
    ;(toCreatePatientDto as jest.Mock).mockReturnValue(mappedDto)
    ;(patientsService.create as jest.Mock).mockResolvedValue(returnedDto)
    ;(toPatientModel as jest.Mock).mockReturnValue(model)

    const result = await createPatientUseCase(input)

    expect(toCreatePatientDto).toHaveBeenCalledWith(input)
    expect(patientsService.create).toHaveBeenCalledWith(mappedDto)
    expect(toPatientModel).toHaveBeenCalledWith(returnedDto)
    expect(result).toBe(model)
  })

  it('propagates errors from patientsService.create', async () => {
    ;(toCreatePatientDto as jest.Mock).mockReturnValue(mappedDto)
    const error = { status: 422, title: 'Unprocessable Entity', detail: 'Validation failed', errors: [{ field: 'email', message: 'E-mail já em uso' }] }
    ;(patientsService.create as jest.Mock).mockRejectedValue(error)

    await expect(createPatientUseCase(input)).rejects.toEqual(error)
  })
})
