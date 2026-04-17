import {
  ArgumentsHost,
  Catch,
  ExceptionFilter,
  HttpException,
  HttpStatus,
  Logger,
} from '@nestjs/common'
import { Request, Response } from 'express'

@Catch()
export class HttpExceptionFilter implements ExceptionFilter {
  private readonly logger = new Logger(HttpExceptionFilter.name)

  catch(exception: unknown, host: ArgumentsHost) {
    const ctx = host.switchToHttp()
    const response = ctx.getResponse<Response>()
    const request = ctx.getRequest<Request & { requestId?: string }>()

    const status =
      exception instanceof HttpException
        ? exception.getStatus()
        : HttpStatus.INTERNAL_SERVER_ERROR

    const exceptionResponse =
      exception instanceof HttpException ? exception.getResponse() : null

    if (status >= 500) {
      this.logger.error('Unhandled exception', {
        requestId: request.requestId,
        path: request.url,
        error: exception instanceof Error ? exception.message : String(exception),
      })
    }

    const errors =
      exceptionResponse &&
      typeof exceptionResponse === 'object' &&
      'message' in exceptionResponse &&
      Array.isArray((exceptionResponse as Record<string, unknown>).message)
        ? ((exceptionResponse as Record<string, unknown>).message as string[]).map((msg) => ({
            field: '',
            message: msg,
          }))
        : undefined

    const detail =
      exceptionResponse &&
      typeof exceptionResponse === 'object' &&
      'message' in exceptionResponse &&
      !Array.isArray((exceptionResponse as Record<string, unknown>).message)
        ? String((exceptionResponse as Record<string, unknown>).message)
        : exception instanceof Error
          ? exception.message
          : 'An unexpected error occurred'

    response.status(status).json({
      type: `https://httpstatuses.com/${status}`,
      title: HttpStatus[status] ?? 'Error',
      status,
      detail,
      instance: request.url,
      requestId: request.requestId,
      ...(errors ? { errors } : {}),
    })
  }
}
