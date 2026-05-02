import { createQueryClient } from './react-query.config'

describe('createQueryClient', () => {
  it('returns a new QueryClient instance on each call', () => {
    const a = createQueryClient()
    const b = createQueryClient()
    expect(a).not.toBe(b)
  })

  it('sets queries.staleTime to 60 seconds', () => {
    const client = createQueryClient()
    expect(client.getDefaultOptions().queries?.staleTime).toBe(1000 * 60)
  })

  it('sets queries.retry to 1', () => {
    const client = createQueryClient()
    expect(client.getDefaultOptions().queries?.retry).toBe(1)
  })

  it('sets queries.refetchOnWindowFocus to false', () => {
    const client = createQueryClient()
    expect(client.getDefaultOptions().queries?.refetchOnWindowFocus).toBe(false)
  })

  it('sets mutations.retry to 0', () => {
    const client = createQueryClient()
    expect(client.getDefaultOptions().mutations?.retry).toBe(0)
  })
})
