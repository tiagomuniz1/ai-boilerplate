import { themesService } from '../services/themes.service'
import { toThemeModel } from '../mappers/to-theme-model'
import type { IPaginatedThemes } from '../types/theme-model.types'

export async function getThemesUseCase(page = 1, limit = 20): Promise<IPaginatedThemes> {
  const dto = await themesService.getAll(page, limit)
  return {
    data: dto.data.map(toThemeModel),
    total: dto.total,
    page: dto.page,
    limit: dto.limit,
  }
}
