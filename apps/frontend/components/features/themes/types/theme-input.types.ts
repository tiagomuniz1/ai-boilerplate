export interface ICreateThemeInput {
  name: string
  slug?: string
  accentColor: string
  accentSoftColor: string
  isDefault?: boolean
}

export interface IUpdateThemeInput {
  name?: string
  accentColor?: string
  accentSoftColor?: string
  isDefault?: boolean
}
