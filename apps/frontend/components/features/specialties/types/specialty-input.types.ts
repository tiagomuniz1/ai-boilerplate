export interface ICreateSpecialtyInput {
  name: string
  description?: string
}

export interface IUpdateSpecialtyInput {
  name?: string
  description?: string | null
}
