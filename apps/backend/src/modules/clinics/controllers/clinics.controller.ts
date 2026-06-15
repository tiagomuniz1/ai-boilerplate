import {
  Body,
  Controller,
  Get,
  HttpCode,
  Param,
  Patch,
  Post,
  Query,
  UnauthorizedException,
  UploadedFile,
  UseInterceptors,
} from '@nestjs/common'
import { FileInterceptor } from '@nestjs/platform-express'
import { Throttle } from '@nestjs/throttler'
import { memoryStorage } from 'multer'
import {
  ClinicResponseDto,
  PaginatedClinicsResponseDto,
  RegisterClinicDto,
  RegisterClinicResponseDto,
  UserRole,
} from '@app/shared'
import { Public } from '../../auth/decorators/public.decorator'
import { CurrentUser } from '../../auth/decorators/current-user.decorator'
import { Roles } from '../../auth/decorators/roles.decorator'
import { ICurrentUser } from '../../auth/types/current-user.type'
import { CreateClinicRequestDto } from '../dto/create-clinic-request.dto'
import { ListClinicsQueryDto } from '../dto/list-clinics-query.dto'
import { UpdateClinicRequestDto } from '../dto/update-clinic-request.dto'
import { CreateClinicUseCase } from '../use-cases/create-clinic.use-case'
import { FindAllClinicsUseCase } from '../use-cases/find-all-clinics.use-case'
import { FindClinicByIdUseCase } from '../use-cases/find-clinic-by-id.use-case'
import { FindClinicBySlugUseCase } from '../use-cases/find-clinic-by-slug.use-case'
import { RegisterClinicUseCase } from '../use-cases/register-clinic.use-case'
import { UpdateClinicUseCase } from '../use-cases/update-clinic.use-case'
import { UploadClinicLogoUseCase } from '../use-cases/upload-clinic-logo.use-case'
import { UploadClinicFaviconUseCase } from '../use-cases/upload-clinic-favicon.use-case'

@Controller('clinics')
export class ClinicsController {
  constructor(
    private readonly createClinicUseCase: CreateClinicUseCase,
    private readonly findAllClinicsUseCase: FindAllClinicsUseCase,
    private readonly findClinicByIdUseCase: FindClinicByIdUseCase,
    private readonly findClinicBySlugUseCase: FindClinicBySlugUseCase,
    private readonly registerClinicUseCase: RegisterClinicUseCase,
    private readonly updateClinicUseCase: UpdateClinicUseCase,
    private readonly uploadClinicLogoUseCase: UploadClinicLogoUseCase,
    private readonly uploadClinicFaviconUseCase: UploadClinicFaviconUseCase,
  ) {}

  @Post('register')
  @Roles(UserRole.PLATFORM_ADMIN)
  @HttpCode(201)
  register(@Body() dto: RegisterClinicDto): Promise<RegisterClinicResponseDto> {
    return this.registerClinicUseCase.execute(dto)
  }

  @Post()
  @Roles(UserRole.PLATFORM_ADMIN)
  @HttpCode(201)
  create(@Body() dto: CreateClinicRequestDto): Promise<ClinicResponseDto> {
    return this.createClinicUseCase.execute(dto)
  }

  @Get()
  @Roles(UserRole.PLATFORM_ADMIN)
  findAll(@Query() query: ListClinicsQueryDto): Promise<PaginatedClinicsResponseDto> {
    return this.findAllClinicsUseCase.execute(query)
  }

  @Get('me')
  @Roles(UserRole.ADMIN, UserRole.DOCTOR, UserRole.USER)
  async findCurrentClinic(@CurrentUser() currentUser: ICurrentUser): Promise<ClinicResponseDto> {
    if (!currentUser.clinicId) throw new UnauthorizedException('No clinic associated with this account')
    return this.findClinicByIdUseCase.execute(currentUser.clinicId)
  }

  @Post('me/logo')
  @Roles(UserRole.ADMIN)
  @UseInterceptors(FileInterceptor('logo', { storage: memoryStorage() }))
  async uploadMyLogo(
    @CurrentUser() currentUser: ICurrentUser,
    @UploadedFile() file: Express.Multer.File,
  ): Promise<ClinicResponseDto> {
    if (!currentUser.clinicId) throw new UnauthorizedException('No clinic associated with this account')
    if (!file) throw new UnauthorizedException('No file provided')
    return this.uploadClinicLogoUseCase.execute(currentUser.clinicId, file)
  }

  @Post('me/favicon')
  @Roles(UserRole.ADMIN)
  @UseInterceptors(FileInterceptor('favicon', { storage: memoryStorage() }))
  async uploadMyFavicon(
    @CurrentUser() currentUser: ICurrentUser,
    @UploadedFile() file: Express.Multer.File,
  ): Promise<ClinicResponseDto> {
    if (!currentUser.clinicId) throw new UnauthorizedException('No clinic associated with this account')
    if (!file) throw new UnauthorizedException('No file provided')
    return this.uploadClinicFaviconUseCase.execute(currentUser.clinicId, file)
  }

  @Get('slug/:slug')
  @Public()
  findBySlug(@Param('slug') slug: string): Promise<ClinicResponseDto> {
    return this.findClinicBySlugUseCase.execute(slug)
  }

  @Get(':id')
  @Roles(UserRole.PLATFORM_ADMIN)
  findById(@Param('id') id: string): Promise<ClinicResponseDto> {
    return this.findClinicByIdUseCase.execute(id)
  }

  @Patch(':id')
  @Roles(UserRole.PLATFORM_ADMIN)
  update(@Param('id') id: string, @Body() dto: UpdateClinicRequestDto): Promise<ClinicResponseDto> {
    return this.updateClinicUseCase.execute(id, dto)
  }

  @Post(':id/logo')
  @Roles(UserRole.PLATFORM_ADMIN)
  @UseInterceptors(FileInterceptor('logo', { storage: memoryStorage() }))
  uploadLogo(
    @Param('id') id: string,
    @UploadedFile() file: Express.Multer.File,
  ): Promise<ClinicResponseDto> {
    if (!file) throw new UnauthorizedException('No file provided')
    return this.uploadClinicLogoUseCase.execute(id, file)
  }

  @Post(':id/favicon')
  @Roles(UserRole.PLATFORM_ADMIN)
  @UseInterceptors(FileInterceptor('favicon', { storage: memoryStorage() }))
  uploadFavicon(
    @Param('id') id: string,
    @UploadedFile() file: Express.Multer.File,
  ): Promise<ClinicResponseDto> {
    if (!file) throw new UnauthorizedException('No file provided')
    return this.uploadClinicFaviconUseCase.execute(id, file)
  }
}
