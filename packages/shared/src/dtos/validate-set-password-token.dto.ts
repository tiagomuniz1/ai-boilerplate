import { IsNotEmpty, IsString } from 'class-validator'

export class ValidateSetPasswordTokenQueryDto {
  @IsString()
  @IsNotEmpty()
  token: string
}

export class ValidateSetPasswordTokenResponseDto {
  valid: boolean
  email: string | null
}
