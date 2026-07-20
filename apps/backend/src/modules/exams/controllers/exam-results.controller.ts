import { Controller, Delete, Get, HttpCode, Param, Res } from '@nestjs/common'
import { Response } from 'express'
import { UserRole } from '@app/shared'
import { Roles } from '../../auth/decorators/roles.decorator'
import { CurrentUser } from '../../auth/decorators/current-user.decorator'
import { ICurrentUser } from '../../auth/types/current-user.type'
import { DeleteExamResultUseCase } from '../use-cases/delete-exam-result.use-case'
import { DownloadExamResultFileUseCase } from '../use-cases/download-exam-result-file.use-case'

@Controller('exam-results')
export class ExamResultsController {
  constructor(
    private readonly deleteExamResultUseCase: DeleteExamResultUseCase,
    private readonly downloadExamResultFileUseCase: DownloadExamResultFileUseCase,
  ) {}

  @Get(':id/file')
  @Roles(UserRole.ADMIN, UserRole.PROFESSIONAL)
  async downloadFile(
    @Param('id') id: string,
    @CurrentUser() currentUser: ICurrentUser,
    @Res({ passthrough: false }) res: Response,
  ): Promise<void> {
    const { buffer, fileName, mimeType } = await this.downloadExamResultFileUseCase.execute(id, currentUser)
    res.set({
      'Content-Type': mimeType,
      'Content-Disposition': `inline; filename="${fileName}"`,
      'Content-Length': buffer.length,
    })
    res.end(buffer)
  }

  @Delete(':id')
  @HttpCode(204)
  @Roles(UserRole.PROFESSIONAL)
  delete(
    @Param('id') id: string,
    @CurrentUser() currentUser: ICurrentUser,
  ): Promise<void> {
    return this.deleteExamResultUseCase.execute(id, currentUser)
  }
}
