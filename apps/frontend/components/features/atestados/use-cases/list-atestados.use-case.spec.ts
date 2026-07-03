jest.mock('../services/atestados.service')
jest.mock('../mappers/to-atestado-model.mapper')

import { atestadosService } from '../services/atestados.service'
import { toAtestadoModel } from '../mappers/to-atestado-model.mapper'
import { listAtestadosUseCase } from './list-atestados.use-case'

const mockService = atestadosService as jest.Mocked<typeof atestadosService>
const mockMapper = toAtestadoModel as jest.Mock

describe('listAtestadosUseCase', () => {
  beforeEach(() => jest.clearAllMocks())

  it('calls service.getByAppointment and maps each dto', async () => {
    const dto1 = { id: 'cert-1' }
    const dto2 = { id: 'cert-2' }
    const model1 = { id: 'cert-1', appointmentId: 'appt-uuid' }
    const model2 = { id: 'cert-2', appointmentId: 'appt-uuid' }
    mockService.getByAppointment.mockResolvedValue([dto1, dto2] as any)
    mockMapper.mockReturnValueOnce(model1).mockReturnValueOnce(model2)

    const result = await listAtestadosUseCase('appt-uuid')

    expect(mockService.getByAppointment).toHaveBeenCalledWith('appt-uuid')
    expect(mockMapper).toHaveBeenCalledTimes(2)
    expect(result).toEqual([model1, model2])
  })

  it('returns empty array when no atestados', async () => {
    mockService.getByAppointment.mockResolvedValue([])
    const result = await listAtestadosUseCase('appt-uuid')
    expect(result).toEqual([])
  })
})
