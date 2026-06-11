import { Body, Controller, Delete, Get, HttpCode, Param, Patch, Post, Query } from '@nestjs/common'
import { Throttle } from '@nestjs/throttler'
import { CreateThemeDto, PaginatedThemesResponseDto, ThemeResponseDto, UpdateThemeDto, UserRole } from '@app/shared'
import { Roles } from '../../auth/decorators/roles.decorator'
import { CurrentUser } from '../../auth/decorators/current-user.decorator'
import { ICurrentUser } from '../../auth/types/current-user.type'
import { PaginationDto } from '../../../common/dto/pagination.dto'
import { CreateThemeUseCase } from '../use-cases/create-theme.use-case'
import { UpdateThemeUseCase } from '../use-cases/update-theme.use-case'
import { DeleteThemeUseCase } from '../use-cases/delete-theme.use-case'
import { FindAllThemesUseCase } from '../use-cases/find-all-themes.use-case'
import { FindThemeByIdUseCase } from '../use-cases/find-theme-by-id.use-case'
import { FindActiveThemeUseCase } from '../use-cases/find-active-theme.use-case'

@Controller('themes')
export class ThemesController {
  constructor(
    private readonly createThemeUseCase: CreateThemeUseCase,
    private readonly updateThemeUseCase: UpdateThemeUseCase,
    private readonly deleteThemeUseCase: DeleteThemeUseCase,
    private readonly findAllThemesUseCase: FindAllThemesUseCase,
    private readonly findThemeByIdUseCase: FindThemeByIdUseCase,
    private readonly findActiveThemeUseCase: FindActiveThemeUseCase,
  ) {}

  @Get('active')
  getActive(@CurrentUser() user: ICurrentUser): Promise<ThemeResponseDto | null> {
    return this.findActiveThemeUseCase.execute(user.clinicId)
  }

  @Get()
  @Roles(UserRole.PLATFORM_ADMIN)
  findAll(@Query() query: PaginationDto): Promise<PaginatedThemesResponseDto> {
    return this.findAllThemesUseCase.execute(query)
  }

  @Get(':id')
  @Roles(UserRole.PLATFORM_ADMIN)
  findById(@Param('id') id: string): Promise<ThemeResponseDto> {
    return this.findThemeByIdUseCase.execute(id)
  }

  @Post()
  @Roles(UserRole.PLATFORM_ADMIN)
  @Throttle({ default: { limit: 20, ttl: 60000 } })
  @HttpCode(201)
  create(@Body() dto: CreateThemeDto): Promise<ThemeResponseDto> {
    return this.createThemeUseCase.execute(dto)
  }

  @Patch(':id')
  @Roles(UserRole.PLATFORM_ADMIN)
  update(@Param('id') id: string, @Body() dto: UpdateThemeDto): Promise<ThemeResponseDto> {
    return this.updateThemeUseCase.execute(id, dto)
  }

  @Delete(':id')
  @Roles(UserRole.PLATFORM_ADMIN)
  @HttpCode(204)
  delete(@Param('id') id: string): Promise<void> {
    return this.deleteThemeUseCase.execute(id)
  }
}
