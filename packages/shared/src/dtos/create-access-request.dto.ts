import { IsEmail, IsOptional, IsString, MinLength } from 'class-validator'

export class CreateAccessRequestDto {
  @IsString()
  @MinLength(1)
  fullName: string

  @IsEmail()
  email: string

  @IsString()
  @MinLength(1)
  clinicName: string

  @IsOptional()
  @IsString()
  phone?: string
}
