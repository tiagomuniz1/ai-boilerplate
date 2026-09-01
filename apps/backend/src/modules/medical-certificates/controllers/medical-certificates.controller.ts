import { Body, Controller, Delete, Get, HttpCode, Param, Post, Query, Res } from '@nestjs/common'
import { Throttle } from '@nestjs/throttler'
import { Response } from 'express'
import { CreateMedicalCertificateDto, MedicalCertificateResponseDto, UserRole } from '@app/shared'
import { Roles } from '../../auth/decorators/roles.decorator'
import { CurrentUser } from '../../auth/decorators/current-user.decorator'
import { ICurrentUser } from '../../auth/types/current-user.type'
import { CreateMedicalCertificateUseCase } from '../use-cases/create-medical-certificate.use-case'
import { FindMedicalCertificatesByAppointmentUseCase } from '../use-cases/find-medical-certificates-by-appointment.use-case'
import { FindMedicalCertificateByIdUseCase } from '../use-cases/find-medical-certificate-by-id.use-case'
import { DeleteMedicalCertificateUseCase } from '../use-cases/delete-medical-certificate.use-case'
import { GenerateMedicalCertificatePdfUseCase } from '../use-cases/generate-medical-certificate-pdf.use-case'
import { ListMedicalCertificatesQueryDto } from '../dto/list-medical-certificates-query.dto'

@Controller('medical-certificates')
export class MedicalCertificatesController {
  constructor(
    private readonly createMedicalCertificateUseCase: CreateMedicalCertificateUseCase,
    private readonly findMedicalCertificatesByAppointmentUseCase: FindMedicalCertificatesByAppointmentUseCase,
    private readonly findMedicalCertificateByIdUseCase: FindMedicalCertificateByIdUseCase,
    private readonly deleteMedicalCertificateUseCase: DeleteMedicalCertificateUseCase,
    private readonly generateMedicalCertificatePdfUseCase: GenerateMedicalCertificatePdfUseCase,
  ) {}

  @Post()
  @Roles(UserRole.ADMIN, UserRole.PROFESSIONAL)
  @Throttle({ default: { limit: 30, ttl: 60000 } })
  create(
    @Body() dto: CreateMedicalCertificateDto,
    @CurrentUser() currentUser: ICurrentUser,
  ): Promise<MedicalCertificateResponseDto> {
    return this.createMedicalCertificateUseCase.execute(dto, currentUser)
  }

  @Get()
  @Roles(UserRole.ADMIN, UserRole.PROFESSIONAL)
  findByAppointment(
    @Query() query: ListMedicalCertificatesQueryDto,
    @CurrentUser() currentUser: ICurrentUser,
  ): Promise<MedicalCertificateResponseDto[]> {
    return this.findMedicalCertificatesByAppointmentUseCase.execute(query.appointmentId, currentUser)
  }

  @Get(':id')
  @Roles(UserRole.ADMIN, UserRole.PROFESSIONAL)
  findById(
    @Param('id') id: string,
    @CurrentUser() currentUser: ICurrentUser,
  ): Promise<MedicalCertificateResponseDto> {
    return this.findMedicalCertificateByIdUseCase.execute(id, currentUser)
  }

  @Delete(':id')
  @HttpCode(204)
  @Roles(UserRole.ADMIN, UserRole.PROFESSIONAL)
  delete(
    @Param('id') id: string,
    @CurrentUser() currentUser: ICurrentUser,
  ): Promise<void> {
    return this.deleteMedicalCertificateUseCase.execute(id, currentUser)
  }

  @Get(':id/pdf')
  @Roles(UserRole.ADMIN, UserRole.PROFESSIONAL)
  async downloadPdf(
    @Param('id') id: string,
    @CurrentUser() currentUser: ICurrentUser,
    @Res({ passthrough: false }) res: Response,
  ): Promise<void> {
    const buffer = await this.generateMedicalCertificatePdfUseCase.execute(id, currentUser)
    res.set({
      'Content-Type': 'application/pdf',
      'Content-Disposition': `attachment; filename="atestado-${id}.pdf"`,
      'Content-Length': buffer.length,
    })
    res.end(buffer)
  }
}
