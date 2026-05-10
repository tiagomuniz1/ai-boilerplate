jest.mock('../services/patients.service')

import { patientsService } from '../services/patients.service'
import { deletePatientUseCase } from './delete-patient.use-case'

describe('deletePatientUseCase', () => {
  it('calls patientsService.remove with id', async () => {
    ;(patientsService.remove as jest.Mock).mockResolvedValue(undefined)

    await deletePatientUseCase('uuid-1')

    expect(patientsService.remove).toHaveBeenCalledWith('uuid-1')
  })

  it('propagates errors from patientsService.remove', async () => {
    const error = { status: 404, title: 'Not Found', detail: 'Patient not found' }
    ;(patientsService.remove as jest.Mock).mockRejectedValue(error)

    await expect(deletePatientUseCase('uuid-1')).rejects.toEqual(error)
  })
})
