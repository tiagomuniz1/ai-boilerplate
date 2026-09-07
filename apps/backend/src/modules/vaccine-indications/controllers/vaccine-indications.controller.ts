import { Body, Controller, Delete, Get, HttpCode, Param, Post, Query, Res } from '@nestjs/common'
import { Throttle } from '@nestjs/throttler'
import { Response } from 'express'
import { CreateVaccineIndicationDto, UserRole, VaccineIndicationResponseDto } from '@app/shared'
import { Roles } from '../../auth/decorators/roles.decorator'
import { CurrentUser } from '../../auth/decorators/current-user.decorator'
import { ICurrentUser } from '../../auth/types/current-user.type'
import { CreateVaccineIndicationUseCase } from '../use-cases/create-vaccine-indication.use-case'
import { FindVaccineIndicationsByAppointmentUseCase } from '../use-cases/find-vaccine-indications-by-appointment.use-case'
import { FindVaccineIndicationByIdUseCase } from '../use-cases/find-vaccine-indication-by-id.use-case'
import { DeleteVaccineIndicationUseCase } from '../use-cases/delete-vaccine-indication.use-case'
import { GenerateVaccineIndicationPdfUseCase } from '../use-cases/generate-vaccine-indication-pdf.use-case'
import { VaccineIndicationListQueryDto } from '../dto/vaccine-indication-list-query.dto'

@Controller('vaccine-indications')
export class VaccineIndicationsController {
  constructor(
    private readonly createVaccineIndicationUseCase: CreateVaccineIndicationUseCase,
    private readonly findVaccineIndicationsByAppointmentUseCase: FindVaccineIndicationsByAppointmentUseCase,
    private readonly findVaccineIndicationByIdUseCase: FindVaccineIndicationByIdUseCase,
    private readonly deleteVaccineIndicationUseCase: DeleteVaccineIndicationUseCase,
    private readonly generateVaccineIndicationPdfUseCase: GenerateVaccineIndicationPdfUseCase,
  ) {}

  @Post()
  @Roles(UserRole.ADMIN, UserRole.PROFESSIONAL)
  @Throttle({ default: { limit: 30, ttl: 60000 } })
  create(
    @Body() dto: CreateVaccineIndicationDto,
    @CurrentUser() currentUser: ICurrentUser,
  ): Promise<VaccineIndicationResponseDto> {
    return this.createVaccineIndicationUseCase.execute(dto, currentUser)
  }

  @Get()
  @Roles(UserRole.ADMIN, UserRole.PROFESSIONAL)
  findByAppointment(
    @Query() query: VaccineIndicationListQueryDto,
    @CurrentUser() currentUser: ICurrentUser,
  ): Promise<VaccineIndicationResponseDto[]> {
    return this.findVaccineIndicationsByAppointmentUseCase.execute(query.appointmentId, currentUser)
  }

  @Get(':id')
  @Roles(UserRole.ADMIN, UserRole.PROFESSIONAL)
  findById(
    @Param('id') id: string,
    @CurrentUser() currentUser: ICurrentUser,
  ): Promise<VaccineIndicationResponseDto> {
    return this.findVaccineIndicationByIdUseCase.execute(id, currentUser)
  }

  @Delete(':id')
  @HttpCode(204)
  @Roles(UserRole.ADMIN, UserRole.PROFESSIONAL)
  delete(@Param('id') id: string, @CurrentUser() currentUser: ICurrentUser): Promise<void> {
    return this.deleteVaccineIndicationUseCase.execute(id, currentUser)
  }

  @Get(':id/pdf')
  @Roles(UserRole.ADMIN, UserRole.PROFESSIONAL)
  async downloadPdf(
    @Param('id') id: string,
    @CurrentUser() currentUser: ICurrentUser,
    @Res({ passthrough: false }) res: Response,
  ): Promise<void> {
    const buffer = await this.generateVaccineIndicationPdfUseCase.execute(id, currentUser)
    res.set({
      'Content-Type': 'application/pdf',
      'Content-Disposition': `attachment; filename="indicacao-vacina-${id}.pdf"`,
      'Content-Length': buffer.length,
    })
    res.end(buffer)
  }
}
