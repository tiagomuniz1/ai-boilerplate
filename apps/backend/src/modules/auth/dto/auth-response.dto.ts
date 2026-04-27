export class AuthResponseDto {
  accessToken: string
  refreshToken: string
  expiresIn: number
}

export class RefreshResponseDto {
  accessToken: string
  refreshToken: string
  expiresIn: number
}
