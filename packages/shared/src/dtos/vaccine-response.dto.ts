export class VaccineResponseDto {
  id!: string
  name!: string
  abbreviation!: string | null
  preventedDiseases!: string | null
  isActive!: boolean
  createdAt!: Date
}
