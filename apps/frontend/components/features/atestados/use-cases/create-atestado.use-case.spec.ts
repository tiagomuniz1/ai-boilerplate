jest.mock('../services/atestados.service')
jest.mock('../mappers/to-create-atestado-dto.mapper')
jest.mock('../mappers/to-atestado-model.mapper')

import { atestadosService } from '../services/atestados.service'
import { toCreateAtestadoDto } from '../mappers/to-create-atestado-dto.mapper'
import { toAtestadoModel } from '../mappers/to-atestado-model.mapper'
import { createAtestadoUseCase } from './create-atestado.use-case'

const mockService = atestadosService as jest.Mocked<typeof atestadosService>
const mockToDto = toCreateAtestadoDto as jest.Mock
const mockToModel = toAtestadoModel as jest.Mock

describe('createAtestadoUseCase', () => {
  beforeEach(() => jest.clearAllMocks())

  it('calls toCreateAtestadoDto, service.create and toAtestadoModel', async () => {
    const input = { appointmentId: 'appt-uuid', type: 'leave', daysOff: 3, startDate: '2026-01-05' }
    const dto = { appointmentId: 'appt-uuid', type: 'leave', daysOff: 3, startDate: '2026-01-05' }
    const responseDto = { id: 'cert-uuid' }
    const model = { id: 'cert-uuid', appointmentId: 'appt-uuid' }

    mockToDto.mockReturnValue(dto)
    mockService.create.mockResolvedValue(responseDto as any)
    mockToModel.mockReturnValue(model)

    const result = await createAtestadoUseCase(input as any)

    expect(mockToDto).toHaveBeenCalledWith(input)
    expect(mockService.create).toHaveBeenCalledWith(dto)
    expect(mockToModel).toHaveBeenCalledWith(responseDto)
    expect(result).toBe(model)
  })

  it('propagates service errors', async () => {
    mockToDto.mockReturnValue({})
    mockService.create.mockRejectedValue({ status: 422 })
    await expect(createAtestadoUseCase({ appointmentId: 'a', type: 'leave' } as any)).rejects.toMatchObject({ status: 422 })
  })
})
