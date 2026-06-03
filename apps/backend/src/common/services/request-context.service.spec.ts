import { RequestContextService } from './request-context.service'

describe('RequestContextService', () => {
  it('returns undefined when called outside a run context', () => {
    expect(RequestContextService.requestId).toBeUndefined()
  })

  it('returns the requestId set in run context', () => {
    let captured: string | undefined

    RequestContextService.run({ requestId: 'test-id' }, () => {
      captured = RequestContextService.requestId
    })

    expect(captured).toBe('test-id')
  })

  it('isolates context between concurrent runs', async () => {
    const results: Array<string | undefined> = []

    await Promise.all([
      new Promise<void>((resolve) =>
        RequestContextService.run({ requestId: 'id-a' }, async () => {
          await new Promise((r) => setTimeout(r, 10))
          results.push(RequestContextService.requestId)
          resolve()
        }),
      ),
      new Promise<void>((resolve) =>
        RequestContextService.run({ requestId: 'id-b' }, async () => {
          results.push(RequestContextService.requestId)
          resolve()
        }),
      ),
    ])

    expect(results).toContain('id-a')
    expect(results).toContain('id-b')
  })

  it('is undefined outside the context after run completes', () => {
    RequestContextService.run({ requestId: 'ephemeral' }, () => {})
    expect(RequestContextService.requestId).toBeUndefined()
  })
})
