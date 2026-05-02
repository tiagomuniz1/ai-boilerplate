import { ArgumentsHost, HttpException, HttpStatus, Logger } from '@nestjs/common'
import { HttpExceptionFilter } from './http-exception.filter'

function makeHost(overrides: { url?: string; requestId?: string } = {}): ArgumentsHost {
  const req = { url: overrides.url ?? '/test', requestId: overrides.requestId }
  const json = jest.fn()
  const status = jest.fn().mockReturnValue({ json })
  const res = { status }
  return {
    switchToHttp: () => ({ getRequest: () => req, getResponse: () => res }),
  } as unknown as ArgumentsHost
}

function getResponse(host: ArgumentsHost) {
  const http = host.switchToHttp()
  const res = http.getResponse<{ status: jest.Mock }>()
  const statusMock = res.status as jest.Mock
  const jsonMock = statusMock.mock.results[0]?.value?.json as jest.Mock
  return { statusCode: statusMock.mock.calls[0]?.[0], body: jsonMock?.mock.calls[0]?.[0] }
}

describe('HttpExceptionFilter', () => {
  let filter: HttpExceptionFilter
  let loggerErrorSpy: jest.SpyInstance

  beforeEach(() => {
    filter = new HttpExceptionFilter()
    loggerErrorSpy = jest.spyOn(Logger.prototype, 'error').mockImplementation()
  })

  afterEach(() => loggerErrorSpy.mockRestore())

  it('returns 500 for unknown exceptions', () => {
    const host = makeHost()
    filter.catch(new Error('boom'), host)
    const { statusCode, body } = getResponse(host)
    expect(statusCode).toBe(500)
    expect(body.status).toBe(500)
  })

  it('returns the HttpException status for known exceptions', () => {
    const host = makeHost()
    filter.catch(new HttpException('Not found', HttpStatus.NOT_FOUND), host)
    const { statusCode, body } = getResponse(host)
    expect(statusCode).toBe(404)
    expect(body.status).toBe(404)
  })

  it('response follows Problem Details shape', () => {
    const host = makeHost({ url: '/users/1' })
    filter.catch(new HttpException('Conflict', HttpStatus.CONFLICT), host)
    const { body } = getResponse(host)
    expect(body).toMatchObject({
      type: 'https://httpstatuses.com/409',
      title: 'CONFLICT',
      status: 409,
      detail: 'Conflict',
      instance: '/users/1',
    })
  })

  it('includes requestId in response when present on request', () => {
    const host = makeHost({ requestId: 'req-123' })
    filter.catch(new HttpException('Bad Request', 400), host)
    const { body } = getResponse(host)
    expect(body.requestId).toBe('req-123')
  })

  it('maps array message to errors array with field and message', () => {
    const host = makeHost()
    filter.catch(
      new HttpException({ message: ['email must be valid', 'password too short'] }, 400),
      host,
    )
    const { body } = getResponse(host)
    expect(body.errors).toEqual([
      { field: '', message: 'email must be valid' },
      { field: '', message: 'password too short' },
    ])
  })

  it('does not include errors array for single string message', () => {
    const host = makeHost()
    filter.catch(new HttpException('Unauthorized', 401), host)
    const { body } = getResponse(host)
    expect(body.errors).toBeUndefined()
  })

  it('logs error for 5xx exceptions', () => {
    const host = makeHost()
    filter.catch(new HttpException('Internal error', 500), host)
    expect(loggerErrorSpy).toHaveBeenCalled()
  })

  it('does not log for 4xx exceptions', () => {
    const host = makeHost()
    filter.catch(new HttpException('Bad Request', 400), host)
    expect(loggerErrorSpy).not.toHaveBeenCalled()
  })

  it('uses exception message as detail for unknown exceptions', () => {
    const host = makeHost()
    filter.catch(new Error('unexpected crash'), host)
    const { body } = getResponse(host)
    expect(body.detail).toBe('unexpected crash')
  })

  it('returns 500 and fallback detail when a non-Error value is thrown', () => {
    const host = makeHost()
    filter.catch('string exception', host)
    const { statusCode, body } = getResponse(host)
    expect(statusCode).toBe(500)
    expect(body.detail).toBe('An unexpected error occurred')
  })

  it('logs String(exception) when a non-Error 5xx is thrown', () => {
    const host = makeHost()
    filter.catch('raw string', host)
    expect(loggerErrorSpy).toHaveBeenCalledWith(
      'Unhandled exception',
      expect.objectContaining({ error: 'raw string' }),
    )
  })

  it('uses object message as detail when exceptionResponse has a string message field', () => {
    const host = makeHost()
    filter.catch(new HttpException({ message: 'Custom error detail' }, 422), host)
    const { body } = getResponse(host)
    expect(body.detail).toBe('Custom error detail')
  })

  it('uses Error fallback title when status is not in HttpStatus enum', () => {
    const host = makeHost()
    filter.catch(new HttpException('msg', 999 as any), host)
    const { body } = getResponse(host)
    expect(body.title).toBe('Error')
  })
})
