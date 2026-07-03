import { atestadosService } from '../services/atestados.service'
import { toAtestadoModel } from '../mappers/to-atestado-model.mapper'
import type { IAtestadoModel } from '../types/atestado-model.types'

export async function listAtestadosUseCase(appointmentId: string): Promise<IAtestadoModel[]> {
  const dtos = await atestadosService.getByAppointment(appointmentId)
  return dtos.map(toAtestadoModel)
}
