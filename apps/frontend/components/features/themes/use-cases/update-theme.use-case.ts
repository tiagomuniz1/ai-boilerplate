import { themesService } from '../services/themes.service'
import { toThemeModel } from '../mappers/to-theme-model'
import type { IUpdateThemeInput } from '../types/theme-input.types'
import type { IThemeModel } from '../types/theme-model.types'

export async function updateThemeUseCase(id: string, data: IUpdateThemeInput): Promise<IThemeModel> {
  const dto = await themesService.update(id, data)
  return toThemeModel(dto)
}
