import { ExecutionContext, CallHandler } from '@nestjs/common'
import { of } from 'rxjs'
import { IdempotencyInterceptor } from './idempotency.interceptor'
import { CacheService } from '../../cache/cache.service'

const mockCacheService: jest.Mocked<Pick<CacheService, 'get' | 'set'>> = {
  get: jest.fn(),
  set: jest.fn(),
}

function makeContext(headers: Record<string, string> = {}): ExecutionContext {
  return {
    switchToHttp: () => ({ getRequest: () => ({ headers }) }),
  } as unknown as ExecutionContext
}

function makeHandler(response: unknown = { data: 'ok' }): CallHandler {
  return { handle: jest.fn().mockReturnValue(of(response)) }
}

describe('IdempotencyInterceptor', () => {
  let interceptor: IdempotencyInterceptor

  beforeEach(() => {
    jest.clearAllMocks()
    interceptor = new IdempotencyInterceptor(mockCacheService as unknown as CacheService)
  })

  it('passes through when no idempotency-key header', async () => {
    const handler = makeHandler()
    const result$ = await interceptor.intercept(makeContext(), handler)
    const values: unknown[] = []
    result$.subscribe((v) => values.push(v))
    expect(handler.handle).toHaveBeenCalled()
    expect(mockCacheService.get).not.toHaveBeenCalled()
  })

  it('returns cached response when key exists in cache', async () => {
    mockCacheService.get.mockResolvedValue({ cached: true })
    const handler = makeHandler()
    const result$ = await interceptor.intercept(
      makeContext({ 'idempotency-key': 'key-123' }),
      handler,
    )
    const values: unknown[] = []
    result$.subscribe((v) => values.push(v))
    expect(values).toEqual([{ cached: true }])
    expect(handler.handle).not.toHaveBeenCalled()
  })

  it('executes handler and caches response on cache miss', async () => {
    mockCacheService.get.mockResolvedValue(null)
    mockCacheService.set.mockResolvedValue(undefined)
    const response = { data: 'fresh' }
    const handler = makeHandler(response)

    const result$ = await interceptor.intercept(
      makeContext({ 'idempotency-key': 'key-456' }),
      handler,
    )

    const values: unknown[] = []
    await new Promise<void>((resolve) => {
      result$.subscribe({
        next: (v) => values.push(v),
        complete: resolve,
      })
    })

    expect(handler.handle).toHaveBeenCalled()
    expect(mockCacheService.set).toHaveBeenCalledWith(
      'idempotency:key-456',
      response,
      86400,
    )
  })

  it('uses prefixed cache key', async () => {
    mockCacheService.get.mockResolvedValue(null)
    mockCacheService.set.mockResolvedValue(undefined)
    const handler = makeHandler()

    await interceptor.intercept(makeContext({ 'idempotency-key': 'abc' }), handler)

    expect(mockCacheService.get).toHaveBeenCalledWith('idempotency:abc')
  })
})
