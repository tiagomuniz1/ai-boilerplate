import { Controller, Delete, Get, HttpCode, Param, Post, Query, Res, UploadedFiles, UseInterceptors } from '@nestjs/common'
import { FilesInterceptor } from '@nestjs/platform-express'
import { Response } from 'express'
import { memoryStorage } from 'multer'
import { ConsultationPhotoResponseDto, PaginatedConsultationPhotosResponseDto, UserRole } from '@app/shared'
import { Roles } from '../../auth/decorators/roles.decorator'
import { CurrentUser } from '../../auth/decorators/current-user.decorator'
import { ICurrentUser } from '../../auth/types/current-user.type'
import { UploadConsultationPhotosUseCase } from '../use-cases/upload-consultation-photos.use-case'
import { FindConsultationPhotosByAppointmentUseCase } from '../use-cases/find-consultation-photos-by-appointment.use-case'
import { FindConsultationPhotosByPatientUseCase } from '../use-cases/find-consultation-photos-by-patient.use-case'
import { DownloadConsultationPhotoFileUseCase } from '../use-cases/download-consultation-photo-file.use-case'
import { DeleteConsultationPhotoUseCase } from '../use-cases/delete-consultation-photo.use-case'
import { ListConsultationPhotosQueryDto } from '../dto/list-consultation-photos-query.dto'
import { ListConsultationPhotosByPatientQueryDto } from '../dto/list-consultation-photos-by-patient-query.dto'

@Controller('consultation-photos')
export class ConsultationPhotosController {
  constructor(
    private readonly uploadConsultationPhotosUseCase: UploadConsultationPhotosUseCase,
    private readonly findConsultationPhotosByAppointmentUseCase: FindConsultationPhotosByAppointmentUseCase,
    private readonly findConsultationPhotosByPatientUseCase: FindConsultationPhotosByPatientUseCase,
    private readonly downloadConsultationPhotoFileUseCase: DownloadConsultationPhotoFileUseCase,
    private readonly deleteConsultationPhotoUseCase: DeleteConsultationPhotoUseCase,
  ) {}

  @Post('appointments/:appointmentId')
  @Roles(UserRole.ADMIN, UserRole.PROFESSIONAL)
  @UseInterceptors(FilesInterceptor('files', 10, { storage: memoryStorage() }))
  upload(
    @Param('appointmentId') appointmentId: string,
    @UploadedFiles() files: Express.Multer.File[],
    @CurrentUser() currentUser: ICurrentUser,
  ): Promise<ConsultationPhotoResponseDto[]> {
    return this.uploadConsultationPhotosUseCase.execute(appointmentId, files, currentUser)
  }

  @Get()
  @Roles(UserRole.ADMIN, UserRole.PROFESSIONAL)
  findByAppointment(
    @Query() query: ListConsultationPhotosQueryDto,
    @CurrentUser() currentUser: ICurrentUser,
  ): Promise<ConsultationPhotoResponseDto[]> {
    return this.findConsultationPhotosByAppointmentUseCase.execute(query.appointmentId, currentUser)
  }

  @Get('by-patient/:patientId')
  @Roles(UserRole.ADMIN, UserRole.PROFESSIONAL)
  findByPatient(
    @Param('patientId') patientId: string,
    @Query() query: ListConsultationPhotosByPatientQueryDto,
    @CurrentUser() currentUser: ICurrentUser,
  ): Promise<PaginatedConsultationPhotosResponseDto> {
    return this.findConsultationPhotosByPatientUseCase.execute(patientId, query, currentUser)
  }

  @Get(':id/file')
  @Roles(UserRole.ADMIN, UserRole.PROFESSIONAL)
  async downloadFile(
    @Param('id') id: string,
    @CurrentUser() currentUser: ICurrentUser,
    @Res({ passthrough: false }) res: Response,
  ): Promise<void> {
    const { buffer, fileName, mimeType } = await this.downloadConsultationPhotoFileUseCase.execute(id, currentUser)
    res.set({
      'Content-Type': mimeType,
      'Content-Disposition': `inline; filename="${fileName}"`,
      'Content-Length': buffer.length,
    })
    res.end(buffer)
  }

  @Delete(':id')
  @HttpCode(204)
  @Roles(UserRole.ADMIN, UserRole.PROFESSIONAL)
  delete(
    @Param('id') id: string,
    @CurrentUser() currentUser: ICurrentUser,
  ): Promise<void> {
    return this.deleteConsultationPhotoUseCase.execute(id, currentUser)
  }
}
