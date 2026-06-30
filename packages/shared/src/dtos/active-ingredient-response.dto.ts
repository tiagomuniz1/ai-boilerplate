export class ActiveIngredientResponseDto {
  id!: string
  name!: string
  representativeMedicationId!: string
}

export class PaginatedActiveIngredientsResponseDto {
  data!: ActiveIngredientResponseDto[]
  total!: number
  page!: number
  limit!: number
  totalPages!: number
}
