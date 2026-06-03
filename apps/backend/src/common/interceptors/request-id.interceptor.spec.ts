import { ExecutionContext, CallHandler } from '@nestjs/common'
import { firstValueFrom, of } from 'rxjs'
import { RequestIdInterceptor } from './request-id.interceptor'
import { RequestContextService } from '../services/request-context.service'

function makeContext(request: Record<string, unknown> = {}): ExecutionContext {
  return {
    switchToHttp: () => ({ getRequest: () => request }),
  } as unknown as ExecutionContext
}

describe('RequestIdInterceptor', () => {
  const interceptor = new RequestIdInterceptor()

  it('sets requestId on the request object', async () => {
    const request: Record<string, unknown> = {}
    const handler: CallHandler = { handle: jest.fn().mockReturnValue(of(null)) }
    await firstValueFrom(interceptor.intercept(makeContext(request), handler))
    expect(typeof request.requestId).toBe('string')
    expect((request.requestId as string).length).toBeGreaterThan(0)
  })

  it('generates a different requestId for each call', async () => {
    const req1: Record<string, unknown> = {}
    const req2: Record<string, unknown> = {}
    const handler: CallHandler = { handle: jest.fn().mockReturnValue(of(null)) }
    await firstValueFrom(interceptor.intercept(makeContext(req1), handler))
    await firstValueFrom(interceptor.intercept(makeContext(req2), handler))
    expect(req1.requestId).not.toBe(req2.requestId)
  })

  it('calls next.handle()', async () => {
    const mockHandler: CallHandler = { handle: jest.fn().mockReturnValue(of(null)) }
    await firstValueFrom(interceptor.intercept(makeContext(), mockHandler))
    expect(mockHandler.handle).toHaveBeenCalled()
  })

  it('makes requestId available via RequestContextService inside handler', async () => {
    let capturedId: string | undefined
    const request: Record<string, unknown> = {}
    const handler: CallHandler = {
      handle: jest.fn().mockReturnValue(
        new (require('rxjs').Observable)((sub: any) => {
          capturedId = RequestContextService.requestId
          sub.next(null)
          sub.complete()
        }),
      ),
    }
    await firstValueFrom(interceptor.intercept(makeContext(request), handler))
    expect(capturedId).toBe(request.requestId)
  })
})
