import { Body, Controller, Delete, Get, HttpCode, Param, Post, Query, Res, UploadedFiles, UseInterceptors } from '@nestjs/common'
import { FilesInterceptor } from '@nestjs/platform-express'
import { Throttle } from '@nestjs/throttler'
import { Response } from 'express'
import { memoryStorage } from 'multer'
import { CreateExamRequestDto, ExamRequestResponseDto, UserRole } from '@app/shared'
import { Roles } from '../../auth/decorators/roles.decorator'
import { CurrentUser } from '../../auth/decorators/current-user.decorator'
import { ICurrentUser } from '../../auth/types/current-user.type'
import { CreateExamRequestUseCase } from '../use-cases/create-exam-request.use-case'
import { FindExamRequestsByAppointmentUseCase } from '../use-cases/find-exam-requests-by-appointment.use-case'
import { FindExamRequestByIdUseCase } from '../use-cases/find-exam-request-by-id.use-case'
import { DeleteExamRequestUseCase } from '../use-cases/delete-exam-request.use-case'
import { GenerateExamRequestPdfUseCase } from '../use-cases/generate-exam-request-pdf.use-case'
import { AddExamResultUseCase } from '../use-cases/add-exam-result.use-case'
import { ListExamRequestsQueryDto } from '../dto/list-exam-requests-query.dto'

@Controller('exam-requests')
export class ExamRequestsController {
  constructor(
    private readonly createExamRequestUseCase: CreateExamRequestUseCase,
    private readonly findExamRequestsByAppointmentUseCase: FindExamRequestsByAppointmentUseCase,
    private readonly findExamRequestByIdUseCase: FindExamRequestByIdUseCase,
    private readonly deleteExamRequestUseCase: DeleteExamRequestUseCase,
    private readonly generateExamRequestPdfUseCase: GenerateExamRequestPdfUseCase,
    private readonly addExamResultUseCase: AddExamResultUseCase,
  ) {}

  @Post()
  @Roles(UserRole.ADMIN, UserRole.PROFESSIONAL)
  @Throttle({ default: { limit: 30, ttl: 60000 } })
  create(
    @Body() dto: CreateExamRequestDto,
    @CurrentUser() currentUser: ICurrentUser,
  ): Promise<ExamRequestResponseDto> {
    return this.createExamRequestUseCase.execute(dto, currentUser)
  }

  @Get()
  @Roles(UserRole.ADMIN, UserRole.PROFESSIONAL)
  findByAppointment(
    @Query() query: ListExamRequestsQueryDto,
    @CurrentUser() currentUser: ICurrentUser,
  ): Promise<ExamRequestResponseDto[]> {
    return this.findExamRequestsByAppointmentUseCase.execute(query.appointmentId, currentUser)
  }

  @Get(':id')
  @Roles(UserRole.ADMIN, UserRole.PROFESSIONAL)
  findById(
    @Param('id') id: string,
    @CurrentUser() currentUser: ICurrentUser,
  ): Promise<ExamRequestResponseDto> {
    return this.findExamRequestByIdUseCase.execute(id, currentUser)
  }

  @Delete(':id')
  @HttpCode(204)
  @Roles(UserRole.ADMIN, UserRole.PROFESSIONAL)
  delete(
    @Param('id') id: string,
    @CurrentUser() currentUser: ICurrentUser,
  ): Promise<void> {
    return this.deleteExamRequestUseCase.execute(id, currentUser)
  }

  @Get(':id/pdf')
  @Roles(UserRole.ADMIN, UserRole.PROFESSIONAL)
  async downloadPdf(
    @Param('id') id: string,
    @CurrentUser() currentUser: ICurrentUser,
    @Res({ passthrough: false }) res: Response,
  ): Promise<void> {
    const buffer = await this.generateExamRequestPdfUseCase.execute(id, currentUser)
    res.set({
      'Content-Type': 'application/pdf',
      'Content-Disposition': `attachment; filename="pedido-exames-${id}.pdf"`,
      'Content-Length': buffer.length,
    })
    res.end(buffer)
  }

  @Post(':id/results')
  @Roles(UserRole.ADMIN, UserRole.PROFESSIONAL)
  @UseInterceptors(FilesInterceptor('files', 5, { storage: memoryStorage() }))
  addResult(
    @Param('id') id: string,
    @UploadedFiles() files: Express.Multer.File[],
    @CurrentUser() currentUser: ICurrentUser,
  ): Promise<ExamRequestResponseDto> {
    return this.addExamResultUseCase.execute(id, files, currentUser)
  }
}
