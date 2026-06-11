import { ThemeBorderRadius } from '../enums/theme-border-radius.enum'

export class ThemeResponseDto {
  id: string
  name: string
  slug: string
  isDefault: boolean
  accentColor: string
  accentSoftColor: string
  borderRadius: ThemeBorderRadius
  bgColor: string | null
  bgDarkColor: string | null
  createdAt: Date
  updatedAt: Date
}
