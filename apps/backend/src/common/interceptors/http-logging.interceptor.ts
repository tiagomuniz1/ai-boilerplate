import { CallHandler, ExecutionContext, Injectable, Logger, NestInterceptor } from '@nestjs/common'
import { Request, Response } from 'express'
import { Observable, tap } from 'rxjs'

interface RequestWithId extends Request {
  requestId?: string
}

@Injectable()
export class HttpLoggingInterceptor implements NestInterceptor {
  private readonly logger = new Logger('HTTP')

  intercept(context: ExecutionContext, next: CallHandler): Observable<unknown> {
    const req = context.switchToHttp().getRequest<RequestWithId>()
    const res = context.switchToHttp().getResponse<Response>()
    const { method, url, requestId } = req
    const start = Date.now()

    return next.handle().pipe(
      tap({
        next: () => {
          this.logger.log(`${method} ${url} → ${res.statusCode} (${Date.now() - start}ms)${requestId ? ` [${requestId}]` : ''}`)
        },
        error: (err: { status?: number }) => {
          const status = err?.status ?? 500
          this.logger.warn(`${method} ${url} → ${status} (${Date.now() - start}ms)${requestId ? ` [${requestId}]` : ''}`)
        },
      }),
    )
  }
}
