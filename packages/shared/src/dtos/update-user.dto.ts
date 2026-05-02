import { IsEmail, IsEnum, IsOptional, IsString, MaxLength, MinLength } from 'class-validator'
import { UserRole } from '../enums/user-role.enum'

export class UpdateUserDto {
  @IsOptional()
  @IsString()
  @MinLength(3)
  @MaxLength(120)
  fullName?: string

  @IsOptional()
  @IsEmail()
  email?: string

  @IsOptional()
  @IsEnum(UserRole)
  role?: UserRole
}
