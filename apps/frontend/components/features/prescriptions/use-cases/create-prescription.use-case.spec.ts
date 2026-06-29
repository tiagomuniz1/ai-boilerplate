jest.mock('../services/prescriptions.service')
jest.mock('../mappers/to-create-prescription-dto.mapper')
jest.mock('../mappers/to-prescription-model.mapper')

import { prescriptionsService } from '../services/prescriptions.service'
import { toCreatePrescriptionDto } from '../mappers/to-create-prescription-dto.mapper'
import { toPrescriptionModel } from '../mappers/to-prescription-model.mapper'
import { createPrescriptionUseCase } from './create-prescription.use-case'

const mockService = prescriptionsService as jest.Mocked<typeof prescriptionsService>
const mockToDto = toCreatePrescriptionDto as jest.Mock
const mockToModel = toPrescriptionModel as jest.Mock

describe('createPrescriptionUseCase', () => {
  beforeEach(() => jest.clearAllMocks())

  it('calls toCreatePrescriptionDto, service.create and toPrescriptionModel', async () => {
    const input = { appointmentId: 'appt-uuid', items: [{ medicationId: 'med-uuid', instructions: 'Tomar 1 cp' }] }
    const dto = { appointmentId: 'appt-uuid', items: [{ medicationId: 'med-uuid', instructions: 'Tomar 1 cp' }] }
    const responseDto = { id: 'rx-uuid' }
    const model = { id: 'rx-uuid', appointmentId: 'appt-uuid' }

    mockToDto.mockReturnValue(dto)
    mockService.create.mockResolvedValue(responseDto as any)
    mockToModel.mockReturnValue(model)

    const result = await createPrescriptionUseCase(input)

    expect(mockToDto).toHaveBeenCalledWith(input)
    expect(mockService.create).toHaveBeenCalledWith(dto)
    expect(mockToModel).toHaveBeenCalledWith(responseDto)
    expect(result).toBe(model)
  })

  it('propagates service errors', async () => {
    mockToDto.mockReturnValue({})
    mockService.create.mockRejectedValue({ status: 422 })
    await expect(createPrescriptionUseCase({ appointmentId: 'a', items: [] })).rejects.toMatchObject({ status: 422 })
  })
})
