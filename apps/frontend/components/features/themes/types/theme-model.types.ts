import { ThemeBorderRadius } from '@app/shared'

export interface IThemeModel {
  id: string
  name: string
  slug: string
  isDefault: boolean
  accentColor: string
  accentSoftColor: string
  borderRadius: ThemeBorderRadius
  createdAt: Date
  updatedAt: Date
}

export interface IPaginatedThemes {
  data: IThemeModel[]
  total: number
  page: number
  limit: number
}
