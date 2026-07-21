jest.mock('../services/professionals.service')

import { professionalsService } from '../services/professionals.service'
import { deleteProfessionalUseCase } from './delete-professional.use-case'

describe('deleteProfessionalUseCase', () => {
  it('calls professionalsService.remove with the given id', async () => {
    ;(professionalsService.remove as jest.Mock).mockResolvedValue(undefined)

    await deleteProfessionalUseCase('uuid-1')

    expect(professionalsService.remove).toHaveBeenCalledWith('uuid-1')
  })

  it('propagates errors from professionalsService.remove', async () => {
    const error = { status: 404, title: 'Not Found', detail: 'Professional not found' }
    ;(professionalsService.remove as jest.Mock).mockRejectedValue(error)

    await expect(deleteProfessionalUseCase('uuid-1')).rejects.toEqual(error)
  })
})
