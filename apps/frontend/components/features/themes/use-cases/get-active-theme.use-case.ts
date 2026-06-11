import { themesService } from '../services/themes.service'
import { toThemeModel } from '../mappers/to-theme-model'
import type { IThemeModel } from '../types/theme-model.types'

export async function getActiveThemeUseCase(): Promise<IThemeModel | null> {
  const dto = await themesService.getActive()
  if (!dto) return null
  return toThemeModel(dto)
}
