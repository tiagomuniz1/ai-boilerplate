jest.mock('../services/prescriptions.service')

import { prescriptionsService } from '../services/prescriptions.service'
import { deletePrescriptionUseCase } from './delete-prescription.use-case'

const mockService = prescriptionsService as jest.Mocked<typeof prescriptionsService>

describe('deletePrescriptionUseCase', () => {
  beforeEach(() => jest.clearAllMocks())

  it('calls service.remove with the given id', async () => {
    mockService.remove.mockResolvedValue(undefined as any)
    await deletePrescriptionUseCase('rx-uuid')
    expect(mockService.remove).toHaveBeenCalledWith('rx-uuid')
  })

  it('propagates service errors', async () => {
    mockService.remove.mockRejectedValue({ status: 404 })
    await expect(deletePrescriptionUseCase('rx-uuid')).rejects.toMatchObject({ status: 404 })
  })
})
