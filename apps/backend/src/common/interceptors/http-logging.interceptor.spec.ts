import { CallHandler, ExecutionContext, Logger } from '@nestjs/common'
import { firstValueFrom, of, throwError } from 'rxjs'
import { HttpLoggingInterceptor } from './http-logging.interceptor'

function makeContext(
  request: Record<string, unknown>,
  response: Record<string, unknown> = {},
): ExecutionContext {
  return {
    switchToHttp: () => ({
      getRequest: () => request,
      getResponse: () => response,
    }),
  } as unknown as ExecutionContext
}

describe('HttpLoggingInterceptor', () => {
  let interceptor: HttpLoggingInterceptor
  let logSpy: jest.SpyInstance
  let warnSpy: jest.SpyInstance

  beforeEach(() => {
    logSpy = jest.spyOn(Logger.prototype, 'log').mockImplementation(() => {})
    warnSpy = jest.spyOn(Logger.prototype, 'warn').mockImplementation(() => {})
    interceptor = new HttpLoggingInterceptor()
  })

  afterEach(() => {
    jest.restoreAllMocks()
  })

  it('logs method, url, status and requestId on success', async () => {
    const request = { method: 'GET', url: '/users', requestId: 'abc-123' }
    const response = { statusCode: 200 }
    const handler: CallHandler = { handle: jest.fn().mockReturnValue(of(null)) }

    await firstValueFrom(interceptor.intercept(makeContext(request, response), handler))

    expect(logSpy).toHaveBeenCalledWith(
      expect.stringMatching(/^GET \/users → 200 \(\d+ms\) \[abc-123\]$/),
    )
  })

  it('omits requestId bracket when requestId is absent', async () => {
    const request = { method: 'POST', url: '/auth/login' }
    const response = { statusCode: 201 }
    const handler: CallHandler = { handle: jest.fn().mockReturnValue(of(null)) }

    await firstValueFrom(interceptor.intercept(makeContext(request, response), handler))

    const message = logSpy.mock.calls[0][0] as string
    expect(message).toMatch(/^POST \/auth\/login → 201 \(\d+ms\)$/)
  })

  it('warns with error status and requestId on error', async () => {
    const request = { method: 'GET', url: '/doctors/123', requestId: 'xyz-999' }
    const response = { statusCode: 200 }
    const err = { status: 404 }
    const handler: CallHandler = { handle: jest.fn().mockReturnValue(throwError(() => err)) }

    await expect(
      firstValueFrom(interceptor.intercept(makeContext(request, response), handler)),
    ).rejects.toBe(err)

    expect(warnSpy).toHaveBeenCalledWith(
      expect.stringMatching(/^GET \/doctors\/123 → 404 \(\d+ms\) \[xyz-999\]$/),
    )
  })

  it('defaults to status 500 when error has no status property', async () => {
    const request = { method: 'DELETE', url: '/users/1', requestId: 'err-id' }
    const response = { statusCode: 200 }
    const err = new Error('Unexpected failure')
    const handler: CallHandler = { handle: jest.fn().mockReturnValue(throwError(() => err)) }

    await expect(
      firstValueFrom(interceptor.intercept(makeContext(request, response), handler)),
    ).rejects.toBe(err)

    expect(warnSpy).toHaveBeenCalledWith(
      expect.stringMatching(/^DELETE \/users\/1 → 500 \(\d+ms\) \[err-id\]$/),
    )
  })

  it('omits requestId bracket on error when requestId is absent', async () => {
    const request = { method: 'GET', url: '/health' }
    const response = { statusCode: 200 }
    const err = { status: 503 }
    const handler: CallHandler = { handle: jest.fn().mockReturnValue(throwError(() => err)) }

    await expect(
      firstValueFrom(interceptor.intercept(makeContext(request, response), handler)),
    ).rejects.toBe(err)

    const message = warnSpy.mock.calls[0][0] as string
    expect(message).toMatch(/^GET \/health → 503 \(\d+ms\)$/)
  })
})
