import { ExecutionContext, CallHandler } from '@nestjs/common'
import { of } from 'rxjs'
import { RequestIdInterceptor } from './request-id.interceptor'

function makeContext(request: Record<string, unknown> = {}): ExecutionContext {
  return {
    switchToHttp: () => ({ getRequest: () => request }),
  } as unknown as ExecutionContext
}

describe('RequestIdInterceptor', () => {
  const interceptor = new RequestIdInterceptor()
  const handler: CallHandler = { handle: jest.fn().mockReturnValue(of(null)) }

  it('sets requestId on the request object', () => {
    const request: Record<string, unknown> = {}
    interceptor.intercept(makeContext(request), handler)
    expect(typeof request.requestId).toBe('string')
    expect((request.requestId as string).length).toBeGreaterThan(0)
  })

  it('generates a different requestId for each call', () => {
    const req1: Record<string, unknown> = {}
    const req2: Record<string, unknown> = {}
    interceptor.intercept(makeContext(req1), handler)
    interceptor.intercept(makeContext(req2), handler)
    expect(req1.requestId).not.toBe(req2.requestId)
  })

  it('calls next.handle()', () => {
    const mockHandler: CallHandler = { handle: jest.fn().mockReturnValue(of(null)) }
    interceptor.intercept(makeContext(), mockHandler)
    expect(mockHandler.handle).toHaveBeenCalled()
  })
})
