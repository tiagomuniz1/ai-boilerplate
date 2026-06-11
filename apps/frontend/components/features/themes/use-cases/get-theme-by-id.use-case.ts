import { themesService } from '../services/themes.service'
import { toThemeModel } from '../mappers/to-theme-model'
import type { IThemeModel } from '../types/theme-model.types'

export async function getThemeByIdUseCase(id: string): Promise<IThemeModel> {
  const dto = await themesService.getById(id)
  return toThemeModel(dto)
}
