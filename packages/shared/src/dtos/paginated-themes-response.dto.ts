import { ThemeResponseDto } from './theme-response.dto'

export class PaginatedThemesResponseDto {
  data: ThemeResponseDto[]
  total: number
  page: number
  limit: number
}
