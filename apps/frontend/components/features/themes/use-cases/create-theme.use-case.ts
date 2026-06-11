import { themesService } from '../services/themes.service'
import { toThemeModel } from '../mappers/to-theme-model'
import type { ICreateThemeInput } from '../types/theme-input.types'
import type { IThemeModel } from '../types/theme-model.types'

export async function createThemeUseCase(data: ICreateThemeInput): Promise<IThemeModel> {
  const dto = await themesService.create(data)
  return toThemeModel(dto)
}
