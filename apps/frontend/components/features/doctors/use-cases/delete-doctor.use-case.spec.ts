jest.mock('../services/doctors.service')

import { doctorsService } from '../services/doctors.service'
import { deleteDoctorUseCase } from './delete-doctor.use-case'

describe('deleteDoctorUseCase', () => {
  it('calls doctorsService.remove with the given id', async () => {
    ;(doctorsService.remove as jest.Mock).mockResolvedValue(undefined)

    await deleteDoctorUseCase('uuid-1')

    expect(doctorsService.remove).toHaveBeenCalledWith('uuid-1')
  })

  it('propagates errors from doctorsService.remove', async () => {
    const error = { status: 404, title: 'Not Found', detail: 'Doctor not found' }
    ;(doctorsService.remove as jest.Mock).mockRejectedValue(error)

    await expect(deleteDoctorUseCase('uuid-1')).rejects.toEqual(error)
  })
})
