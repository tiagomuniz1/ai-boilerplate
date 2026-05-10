jest.mock('../services/patients.service')
jest.mock('../mappers/to-patient-model.mapper')

import { PatientGender } from '@app/shared'
import { patientsService } from '../services/patients.service'
import { toPatientModel } from '../mappers/to-patient-model.mapper'
import { getPatientUseCase } from './get-patient.use-case'

const makeDto = () => ({
  id: 'uuid-1',
  fullName: 'João Silva',
  email: 'joao@example.com',
  phoneNumber: '(11) 99999-9999',
  birthDate: '1990-05-15',
  documentNumber: '12345678901',
  gender: PatientGender.MALE,
  createdAt: new Date(),
  updatedAt: new Date(),
})

const makeModel = () => ({
  id: 'uuid-1',
  fullName: 'João Silva',
  email: 'joao@example.com',
  phoneNumber: '(11) 99999-9999',
  birthDate: new Date('1990-05-15'),
  documentNumber: '12345678901',
  gender: PatientGender.MALE,
  createdAt: new Date(),
  updatedAt: new Date(),
})

describe('getPatientUseCase', () => {
  it('calls patientsService.getById with id, maps dto and returns model', async () => {
    const dto = makeDto()
    const model = makeModel()
    ;(patientsService.getById as jest.Mock).mockResolvedValue(dto)
    ;(toPatientModel as jest.Mock).mockReturnValue(model)

    const result = await getPatientUseCase('uuid-1')

    expect(patientsService.getById).toHaveBeenCalledWith('uuid-1')
    expect(toPatientModel).toHaveBeenCalledWith(dto)
    expect(result).toBe(model)
  })

  it('propagates errors from patientsService.getById', async () => {
    const error = { status: 404, title: 'Not Found', detail: 'Patient not found' }
    ;(patientsService.getById as jest.Mock).mockRejectedValue(error)

    await expect(getPatientUseCase('uuid-1')).rejects.toEqual(error)
  })
})
