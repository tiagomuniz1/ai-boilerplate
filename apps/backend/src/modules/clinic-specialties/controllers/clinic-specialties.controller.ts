import { Controller, Delete, Get, HttpCode, Param, Post, Query } from '@nestjs/common'
import { ClinicSpecialtyResponseDto, PaginatedClinicSpecialtiesResponseDto, UserRole } from '@app/shared'
import { CurrentUser } from '../../auth/decorators/current-user.decorator'
import { Roles } from '../../auth/decorators/roles.decorator'
import { ICurrentUser } from '../../auth/types/current-user.type'
import { ClinicSpecialtiesListQueryDto } from '../dto/clinic-specialties-list-query.dto'
import { FindClinicSpecialtiesUseCase } from '../use-cases/find-clinic-specialties.use-case'
import { LinkSpecialtyToClinicUseCase } from '../use-cases/link-specialty-to-clinic.use-case'
import { UnlinkSpecialtyFromClinicUseCase } from '../use-cases/unlink-specialty-from-clinic.use-case'

@Controller('clinics/:clinicId/specialties')
export class ClinicSpecialtiesController {
  constructor(
    private readonly linkSpecialtyToClinicUseCase: LinkSpecialtyToClinicUseCase,
    private readonly unlinkSpecialtyFromClinicUseCase: UnlinkSpecialtyFromClinicUseCase,
    private readonly findClinicSpecialtiesUseCase: FindClinicSpecialtiesUseCase,
  ) {}

  @Get()
  @Roles(UserRole.PLATFORM_ADMIN, UserRole.ADMIN, UserRole.PROFESSIONAL, UserRole.USER)
  findAll(
    @Param('clinicId') clinicId: string,
    @Query() query: ClinicSpecialtiesListQueryDto,
    @CurrentUser() currentUser: ICurrentUser,
  ): Promise<PaginatedClinicSpecialtiesResponseDto> {
    return this.findClinicSpecialtiesUseCase.execute(clinicId, query, currentUser)
  }

  @Post(':specialtyId')
  @Roles(UserRole.PLATFORM_ADMIN)
  @HttpCode(201)
  link(
    @Param('clinicId') clinicId: string,
    @Param('specialtyId') specialtyId: string,
  ): Promise<ClinicSpecialtyResponseDto> {
    return this.linkSpecialtyToClinicUseCase.execute(clinicId, specialtyId)
  }

  @Delete(':specialtyId')
  @Roles(UserRole.PLATFORM_ADMIN)
  @HttpCode(204)
  unlink(
    @Param('clinicId') clinicId: string,
    @Param('specialtyId') specialtyId: string,
  ): Promise<void> {
    return this.unlinkSpecialtyFromClinicUseCase.execute(clinicId, specialtyId)
  }
}
