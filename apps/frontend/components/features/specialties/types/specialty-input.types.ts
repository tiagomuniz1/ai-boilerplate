export interface ICreateSpecialtyInput {
  name: string
  description?: string
  titleName?: string
}

export interface IUpdateSpecialtyInput {
  name?: string
  description?: string | null
  titleName?: string | null
}
