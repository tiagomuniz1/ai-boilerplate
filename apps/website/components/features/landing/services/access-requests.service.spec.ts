import { accessRequestsService } from './access-requests.service'

describe('accessRequestsService', () => {
  const originalFetch = global.fetch

  afterEach(() => {
    global.fetch = originalFetch
  })

  const input = {
    fullName: 'Ana Costa',
    email: 'ana@clinica.com',
    clinicName: 'Clínica do Vale',
  }

  it('posts to /access-requests with the given payload', async () => {
    const mockFetch = jest.fn().mockResolvedValue({ ok: true })
    global.fetch = mockFetch as unknown as typeof fetch

    await accessRequestsService.create(input)

    expect(mockFetch).toHaveBeenCalledWith(
      expect.stringContaining('/access-requests'),
      expect.objectContaining({
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(input),
      }),
    )
  })

  it('throws when the response is not ok', async () => {
    global.fetch = jest.fn().mockResolvedValue({ ok: false }) as unknown as typeof fetch

    await expect(accessRequestsService.create(input)).rejects.toThrow(
      'Failed to submit access request',
    )
  })

  it('resolves when the response is ok', async () => {
    global.fetch = jest.fn().mockResolvedValue({ ok: true }) as unknown as typeof fetch

    await expect(accessRequestsService.create(input)).resolves.toBeUndefined()
  })
})
