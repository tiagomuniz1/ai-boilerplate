jest.mock('../services/atestados.service')

import { atestadosService } from '../services/atestados.service'
import { deleteAtestadoUseCase } from './delete-atestado.use-case'

const mockService = atestadosService as jest.Mocked<typeof atestadosService>

describe('deleteAtestadoUseCase', () => {
  beforeEach(() => jest.clearAllMocks())

  it('calls service.remove with the given id', async () => {
    mockService.remove.mockResolvedValue(undefined as any)
    await deleteAtestadoUseCase('cert-uuid')
    expect(mockService.remove).toHaveBeenCalledWith('cert-uuid')
  })

  it('propagates service errors', async () => {
    mockService.remove.mockRejectedValue({ status: 404 })
    await expect(deleteAtestadoUseCase('cert-uuid')).rejects.toMatchObject({ status: 404 })
  })
})
