import { atestadosService } from '../services/atestados.service'
import { toCreateAtestadoDto } from '../mappers/to-create-atestado-dto.mapper'
import { toAtestadoModel } from '../mappers/to-atestado-model.mapper'
import type { ICreateAtestadoInput } from '../types/atestado-input.types'
import type { IAtestadoModel } from '../types/atestado-model.types'

export async function createAtestadoUseCase(input: ICreateAtestadoInput): Promise<IAtestadoModel> {
  const dto = await atestadosService.create(toCreateAtestadoDto(input))
  return toAtestadoModel(dto)
}
