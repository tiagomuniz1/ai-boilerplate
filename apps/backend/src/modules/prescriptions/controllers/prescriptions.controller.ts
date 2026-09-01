import { Body, Controller, Delete, Get, HttpCode, Param, Post, Query, Res } from '@nestjs/common'
import { Throttle } from '@nestjs/throttler'
import { Response } from 'express'
import {
  CreatePrescriptionDto,
  PrescriptionResponseDto,
  UserRole,
  VerifyPrescriptionResponseDto,
} from '@app/shared'
import { Roles } from '../../auth/decorators/roles.decorator'
import { Public } from '../../auth/decorators/public.decorator'
import { CurrentUser } from '../../auth/decorators/current-user.decorator'
import { ICurrentUser } from '../../auth/types/current-user.type'
import { CreatePrescriptionUseCase } from '../use-cases/create-prescription.use-case'
import { FindPrescriptionsByAppointmentUseCase } from '../use-cases/find-prescriptions-by-appointment.use-case'
import { FindPrescriptionByIdUseCase } from '../use-cases/find-prescription-by-id.use-case'
import { DeletePrescriptionUseCase } from '../use-cases/delete-prescription.use-case'
import { GeneratePrescriptionPdfUseCase } from '../use-cases/generate-prescription-pdf.use-case'
import { VerifyPrescriptionUseCase } from '../use-cases/verify-prescription.use-case'
import { PrescriptionListQueryDto } from '../dto/prescription-list-query.dto'

@Controller('prescriptions')
export class PrescriptionsController {
  constructor(
    private readonly createPrescriptionUseCase: CreatePrescriptionUseCase,
    private readonly findPrescriptionsByAppointmentUseCase: FindPrescriptionsByAppointmentUseCase,
    private readonly findPrescriptionByIdUseCase: FindPrescriptionByIdUseCase,
    private readonly deletePrescriptionUseCase: DeletePrescriptionUseCase,
    private readonly generatePrescriptionPdfUseCase: GeneratePrescriptionPdfUseCase,
    private readonly verifyPrescriptionUseCase: VerifyPrescriptionUseCase,
  ) {}

  @Get('verify/:token')
  @Public()
  @Throttle({ default: { limit: 60, ttl: 60000 } })
  verify(@Param('token') token: string): Promise<VerifyPrescriptionResponseDto> {
    return this.verifyPrescriptionUseCase.execute(token)
  }

  @Post()
  @Roles(UserRole.ADMIN, UserRole.PROFESSIONAL)
  @Throttle({ default: { limit: 30, ttl: 60000 } })
  create(
    @Body() dto: CreatePrescriptionDto,
    @CurrentUser() currentUser: ICurrentUser,
  ): Promise<PrescriptionResponseDto> {
    return this.createPrescriptionUseCase.execute(dto, currentUser)
  }

  @Get()
  @Roles(UserRole.ADMIN, UserRole.PROFESSIONAL)
  findByAppointment(
    @Query() query: PrescriptionListQueryDto,
    @CurrentUser() currentUser: ICurrentUser,
  ): Promise<PrescriptionResponseDto[]> {
    return this.findPrescriptionsByAppointmentUseCase.execute(query.appointmentId, currentUser)
  }

  @Get(':id')
  @Roles(UserRole.ADMIN, UserRole.PROFESSIONAL)
  findById(
    @Param('id') id: string,
    @CurrentUser() currentUser: ICurrentUser,
  ): Promise<PrescriptionResponseDto> {
    return this.findPrescriptionByIdUseCase.execute(id, currentUser)
  }

  @Delete(':id')
  @HttpCode(204)
  @Roles(UserRole.ADMIN, UserRole.PROFESSIONAL)
  delete(
    @Param('id') id: string,
    @CurrentUser() currentUser: ICurrentUser,
  ): Promise<void> {
    return this.deletePrescriptionUseCase.execute(id, currentUser)
  }

  @Get(':id/pdf')
  @Roles(UserRole.ADMIN, UserRole.PROFESSIONAL)
  async downloadPdf(
    @Param('id') id: string,
    @CurrentUser() currentUser: ICurrentUser,
    @Res({ passthrough: false }) res: Response,
  ): Promise<void> {
    const buffer = await this.generatePrescriptionPdfUseCase.execute(id, currentUser)
    res.set({
      'Content-Type': 'application/pdf',
      'Content-Disposition': `attachment; filename="receita-${id}.pdf"`,
      'Content-Length': buffer.length,
    })
    res.end(buffer)
  }
}
