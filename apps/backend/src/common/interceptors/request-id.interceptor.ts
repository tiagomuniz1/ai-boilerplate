import { CallHandler, ExecutionContext, Injectable, NestInterceptor } from '@nestjs/common'
import { Observable } from 'rxjs'
import { randomUUID } from 'crypto'
import { RequestContextService } from '../services/request-context.service'

@Injectable()
export class RequestIdInterceptor implements NestInterceptor {
  intercept(context: ExecutionContext, next: CallHandler): Observable<unknown> {
    const request = context.switchToHttp().getRequest<{ requestId?: string }>()
    const requestId = randomUUID()
    request.requestId = requestId

    return new Observable((subscriber) => {
      RequestContextService.run({ requestId }, () => {
        next.handle().subscribe(subscriber)
      })
    })
  }
}
