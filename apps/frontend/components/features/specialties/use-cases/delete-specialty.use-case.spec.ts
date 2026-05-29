jest.mock('../services/specialties.service')

import { specialtiesService } from '../services/specialties.service'
import { deleteSpecialtyUseCase } from './delete-specialty.use-case'

describe('deleteSpecialtyUseCase', () => {
  it('calls specialtiesService.remove with the given id', async () => {
    ;(specialtiesService.remove as jest.Mock).mockResolvedValue(undefined)

    await deleteSpecialtyUseCase('uuid-1')

    expect(specialtiesService.remove).toHaveBeenCalledWith('uuid-1')
  })

  it('propagates errors from specialtiesService.remove', async () => {
    const error = { status: 404, title: 'Not Found', detail: 'Specialty not found' }
    ;(specialtiesService.remove as jest.Mock).mockRejectedValue(error)

    await expect(deleteSpecialtyUseCase('uuid-1')).rejects.toEqual(error)
  })
})
