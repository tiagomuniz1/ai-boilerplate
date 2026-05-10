jest.mock('../services/patients.service')
jest.mock('../mappers/to-patient-model.mapper')

import { PatientGender } from '@app/shared'
import { patientsService } from '../services/patients.service'
import { toPatientModel } from '../mappers/to-patient-model.mapper'
import { listPatientsUseCase } from './list-patients.use-case'

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

describe('listPatientsUseCase', () => {
  it('calls patientsService.getAll, maps each dto and returns models', async () => {
    const dtos = [makeDto()]
    const model = makeModel()
    ;(patientsService.getAll as jest.Mock).mockResolvedValue({ data: dtos, total: 1, page: 1, limit: 20 })
    ;(toPatientModel as jest.Mock).mockReturnValue(model)

    const result = await listPatientsUseCase()

    expect(patientsService.getAll).toHaveBeenCalledWith(undefined)
    const [firstArg] = (toPatientModel as jest.Mock).mock.calls[0]
    expect(firstArg).toEqual(dtos[0])
    expect(result).toEqual([model])
  })

  it('passes params to patientsService.getAll', async () => {
    const params = { search: 'João', page: 2, limit: 10 }
    ;(patientsService.getAll as jest.Mock).mockResolvedValue({ data: [], total: 0, page: 2, limit: 10 })

    await listPatientsUseCase(params)

    expect(patientsService.getAll).toHaveBeenCalledWith(params)
  })

  it('propagates errors from patientsService.getAll', async () => {
    const error = { status: 500, title: 'Internal Error', detail: 'Server error' }
    ;(patientsService.getAll as jest.Mock).mockRejectedValue(error)

    await expect(listPatientsUseCase()).rejects.toEqual(error)
  })
})
