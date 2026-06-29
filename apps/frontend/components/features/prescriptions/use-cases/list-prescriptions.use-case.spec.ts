jest.mock('../services/prescriptions.service')
jest.mock('../mappers/to-prescription-model.mapper')

import { prescriptionsService } from '../services/prescriptions.service'
import { toPrescriptionModel } from '../mappers/to-prescription-model.mapper'
import { listPrescriptionsUseCase } from './list-prescriptions.use-case'

const mockService = prescriptionsService as jest.Mocked<typeof prescriptionsService>
const mockMapper = toPrescriptionModel as jest.Mock

describe('listPrescriptionsUseCase', () => {
  beforeEach(() => jest.clearAllMocks())

  it('calls service.getByAppointment and maps each dto', async () => {
    const dto1 = { id: 'rx-1' }
    const dto2 = { id: 'rx-2' }
    const model1 = { id: 'rx-1', appointmentId: 'appt-uuid' }
    const model2 = { id: 'rx-2', appointmentId: 'appt-uuid' }
    mockService.getByAppointment.mockResolvedValue([dto1, dto2] as any)
    mockMapper.mockReturnValueOnce(model1).mockReturnValueOnce(model2)

    const result = await listPrescriptionsUseCase('appt-uuid')

    expect(mockService.getByAppointment).toHaveBeenCalledWith('appt-uuid')
    expect(mockMapper).toHaveBeenCalledTimes(2)
    expect(result).toEqual([model1, model2])
  })

  it('returns empty array when no prescriptions', async () => {
    mockService.getByAppointment.mockResolvedValue([])
    const result = await listPrescriptionsUseCase('appt-uuid')
    expect(result).toEqual([])
  })
})
