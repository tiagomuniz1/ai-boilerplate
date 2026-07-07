import { IsOptional, IsString, MaxLength, MinLength } from 'class-validator'

export class CreateSpecialtyDto {
  @IsString()
  @MinLength(3)
  @MaxLength(100)
  name!: string

  @IsOptional()
  @IsString()
  @MaxLength(500)
  description?: string

  // Profession/specialist title shown on prescriptions, certificates and exam requests
  // (e.g. "mastologista" for the "Mastologia" specialty). Falls back to `name` when empty.
  @IsOptional()
  @IsString()
  @MaxLength(100)
  titleName?: string
}
