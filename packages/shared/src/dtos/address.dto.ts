import { IsOptional, IsString, Length, Matches, MaxLength, MinLength } from 'class-validator'
import { Transform } from 'class-transformer'

export class AddressDto {
  @IsString()
  @MinLength(1)
  @MaxLength(255)
  street!: string

  @IsString()
  @MinLength(1)
  @MaxLength(20)
  number!: string

  @IsOptional()
  @IsString()
  @MaxLength(100)
  complement?: string | null

  @IsString()
  @MinLength(1)
  @MaxLength(100)
  neighborhood!: string

  @IsString()
  @MinLength(1)
  @MaxLength(100)
  city!: string

  @IsString()
  @Length(2, 2)
  @Transform(({ value }) => (typeof value === 'string' ? value.toUpperCase() : value))
  state!: string

  @IsString()
  @Matches(/^\d{5}-\d{3}$/, { message: 'zipCode must be in format 00000-000' })
  zipCode!: string

  @IsOptional()
  @IsString()
  @Length(2, 2)
  @Transform(({ value }) => (typeof value === 'string' ? value.toUpperCase() : 'BR'))
  country: string = 'BR'
}
