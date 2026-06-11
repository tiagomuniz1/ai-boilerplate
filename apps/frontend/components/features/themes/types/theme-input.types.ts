import { ThemeBorderRadius } from '@app/shared'

export interface ICreateThemeInput {
  name: string
  slug?: string
  accentColor: string
  accentSoftColor: string
  isDefault?: boolean
  borderRadius?: ThemeBorderRadius
}

export interface IUpdateThemeInput {
  name?: string
  accentColor?: string
  accentSoftColor?: string
  isDefault?: boolean
  borderRadius?: ThemeBorderRadius
}
