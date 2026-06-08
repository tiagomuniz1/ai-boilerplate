jest.mock('../services/clinics.service')
jest.mock('../mappers/to-clinic-model')

import { clinicsService } from '../services/clinics.service'
import { toClinicModel } from '../mappers/to-clinic-model'
import { updateClinicUseCase } from './update-clinic.use-case'

const makeDto = () => ({
  id: 'uuid-1',
  name: 'Clínica Atualizada',
  slug: 'clinica-atualizada',
  isActive: false,
  createdAt: new Date('2024-01-15'),
  updatedAt: new Date('2024-01-17'),
})

const makeModel = () => ({
  id: 'uuid-1',
  name: 'Clínica Atualizada',
  slug: 'clinica-atualizada',
  isActive: false,
  createdAt: new Date('2024-01-15'),
  updatedAt: new Date('2024-01-17'),
})

describe('updateClinicUseCase', () => {
  it('calls clinicsService.update with id and input and returns mapped model', async () => {
    const dto = makeDto()
    const model = makeModel()
    const input = { name: 'Clínica Atualizada', isActive: false }
    ;(clinicsService.update as jest.Mock).mockResolvedValue(dto)
    ;(toClinicModel as jest.Mock).mockReturnValue(model)

    const result = await updateClinicUseCase('uuid-1', input)

    expect(clinicsService.update).toHaveBeenCalledWith('uuid-1', input)
    const [firstArg] = (toClinicModel as jest.Mock).mock.calls[0]
    expect(firstArg).toEqual(dto)
    expect(result).toEqual(model)
  })

  it('propagates errors from clinicsService.update', async () => {
    const error = { status: 404, title: 'Not Found', detail: 'Clinic not found' }
    ;(clinicsService.update as jest.Mock).mockRejectedValue(error)

    await expect(updateClinicUseCase('uuid-1', { name: 'New Name' })).rejects.toEqual(error)
  })
})
