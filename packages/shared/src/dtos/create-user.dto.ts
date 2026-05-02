import { IsEmail, IsEnum, IsOptional, IsString, MaxLength, MinLength } from 'class-validator'
import { UserRole } from '../enums/user-role.enum'

export class CreateUserDto {
  @IsString()
  @MinLength(3)
  @MaxLength(120)
  fullName: string

  @IsEmail()
  email: string

  @IsString()
  @MinLength(8)
  @MaxLength(64)
  password: string

  @IsOptional()
  @IsEnum(UserRole)
  role: UserRole = UserRole.USER
}
