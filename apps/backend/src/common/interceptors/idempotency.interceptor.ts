import {
  CallHandler,
  ExecutionContext,
  Injectable,
  NestInterceptor,
} from '@nestjs/common'
import { Observable, of, tap } from 'rxjs'
import { Request } from 'express'
import { CacheService } from '../../cache/cache.service'

@Injectable()
export class IdempotencyInterceptor implements NestInterceptor {
  constructor(private readonly cacheService: CacheService) {}

  async intercept(
    context: ExecutionContext,
    next: CallHandler,
  ): Promise<Observable<unknown>> {
    const request = context.switchToHttp().getRequest<Request>()
    const idempotencyKey = request.headers['idempotency-key'] as string | undefined

    if (!idempotencyKey) return next.handle()

    const cacheKey = `idempotency:${idempotencyKey}`
    const cached = await this.cacheService.get<unknown>(cacheKey)

    if (cached) return of(cached)

    return next.handle().pipe(
      tap(async (response) => {
        await this.cacheService.set(cacheKey, response, 86400)
      }),
    )
  }
}
