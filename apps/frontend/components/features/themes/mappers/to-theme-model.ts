import type { ThemeResponseDto } from '@app/shared'
import type { IThemeModel } from '../types/theme-model.types'

export function toThemeModel(dto: ThemeResponseDto): IThemeModel {
  return {
    id: dto.id,
    name: dto.name,
    slug: dto.slug,
    isDefault: dto.isDefault,
    accentColor: dto.accentColor,
    accentSoftColor: dto.accentSoftColor,
    borderRadius: dto.borderRadius,
    bgColor: dto.bgColor,
    bgDarkColor: dto.bgDarkColor,
    createdAt: new Date(dto.createdAt),
    updatedAt: new Date(dto.updatedAt),
  }
}
