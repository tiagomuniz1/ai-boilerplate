jest.mock('../services/patients.service')
jest.mock('../mappers/to-patient-model.mapper')
jest.mock('../mappers/to-update-patient-dto.mapper')

import { PatientGender } from '@app/shared'
import { patientsService } from '../services/patients.service'
import { toPatientModel } from '../mappers/to-patient-model.mapper'
import { toUpdatePatientDto } from '../mappers/to-update-patient-dto.mapper'
import { updatePatientUseCase } from './update-patient.use-case'

describe('updatePatientUseCase', () => {
  const input = { fullName: 'João Atualizado', gender: PatientGender.MALE }
  const mappedDto = { fullName: 'João Atualizado', gender: PatientGender.MALE }
  const returnedDto = { id: 'uuid-1', fullName: 'João Atualizado', email: 'joao@example.com', phoneNumber: '(11) 99999-9999', birthDate: '1990-05-15', documentNumber: '12345678901', gender: PatientGender.MALE, createdAt: new Date(), updatedAt: new Date() }
  const model = { id: 'uuid-1', fullName: 'João Atualizado', email: 'joao@example.com', phoneNumber: '(11) 99999-9999', birthDate: new Date('1990-05-15'), documentNumber: '12345678901', gender: PatientGender.MALE, createdAt: new Date(), updatedAt: new Date() }

  it('maps input to dto, calls patientsService.update and returns mapped model', async () => {
    ;(toUpdatePatientDto as jest.Mock).mockReturnValue(mappedDto)
    ;(patientsService.update as jest.Mock).mockResolvedValue(returnedDto)
    ;(toPatientModel as jest.Mock).mockReturnValue(model)

    const result = await updatePatientUseCase('uuid-1', input)

    expect(toUpdatePatientDto).toHaveBeenCalledWith(input)
    expect(patientsService.update).toHaveBeenCalledWith('uuid-1', mappedDto)
    expect(toPatientModel).toHaveBeenCalledWith(returnedDto)
    expect(result).toBe(model)
  })

  it('propagates errors from patientsService.update', async () => {
    ;(toUpdatePatientDto as jest.Mock).mockReturnValue(mappedDto)
    const error = { status: 404, title: 'Not Found', detail: 'Patient not found' }
    ;(patientsService.update as jest.Mock).mockRejectedValue(error)

    await expect(updatePatientUseCase('uuid-1', input)).rejects.toEqual(error)
  })
})
