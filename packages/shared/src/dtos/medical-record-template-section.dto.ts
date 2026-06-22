import { IsInt, IsOptional, IsString, MaxLength, Min, MinLength } from 'class-validator'

export class MedicalRecordTemplateSectionDto {
  @IsOptional()
  @IsString()
  key?: string

  @IsString()
  @MinLength(1)
  @MaxLength(80)
  title!: string

  @IsInt()
  @Min(0)
  order!: number
}
