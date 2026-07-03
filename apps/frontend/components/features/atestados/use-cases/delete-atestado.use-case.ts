import { atestadosService } from '../services/atestados.service'

export async function deleteAtestadoUseCase(id: string): Promise<void> {
  await atestadosService.remove(id)
}
