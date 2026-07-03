jest.mock('axios')

const mockSharp = jest.fn()
jest.mock('sharp', () => ({ __esModule: true, default: mockSharp }))

import axios from 'axios'
import { LogoFetcherService } from './logo-fetcher.service'

const mockAxiosGet = axios.get as jest.Mock

describe('LogoFetcherService', () => {
  let service: LogoFetcherService

  beforeEach(() => {
    jest.clearAllMocks()
    service = new LogoFetcherService()
  })

  it('returns base64 data URI for PNG', async () => {
    const buffer = Buffer.from('fake-png-bytes')
    mockAxiosGet.mockResolvedValue({
      data: buffer,
      headers: { 'content-type': 'image/png' },
    })

    const result = await service.fetchAsBase64('https://example.com/logo.png')

    expect(mockAxiosGet).toHaveBeenCalledWith('https://example.com/logo.png', {
      responseType: 'arraybuffer',
      timeout: 4000,
    })
    expect(result).toBe(`data:image/png;base64,${buffer.toString('base64')}`)
  })

  it('returns base64 data URI for JPEG', async () => {
    const buffer = Buffer.from('fake-jpeg-bytes')
    mockAxiosGet.mockResolvedValue({
      data: buffer,
      headers: { 'content-type': 'image/jpeg; charset=utf-8' },
    })

    const result = await service.fetchAsBase64('https://example.com/logo.jpg')

    expect(result).toMatch(/^data:image\/jpeg;base64,/)
  })

  it('converts WebP to PNG via sharp', async () => {
    const webpBuffer = Buffer.from('fake-webp-bytes')
    const pngBuffer = Buffer.from('converted-png-bytes')
    mockAxiosGet.mockResolvedValue({
      data: webpBuffer,
      headers: { 'content-type': 'image/webp' },
    })
    const mockToBuffer = jest.fn().mockResolvedValue(pngBuffer)
    const mockPng = jest.fn().mockReturnValue({ toBuffer: mockToBuffer })
    mockSharp.mockReturnValue({ png: mockPng })

    const result = await service.fetchAsBase64('https://example.com/logo.webp')

    expect(mockSharp).toHaveBeenCalledWith(Buffer.from(webpBuffer))
    expect(result).toBe(`data:image/png;base64,${pngBuffer.toString('base64')}`)
  })

  it('returns null when content-type header is absent', async () => {
    mockAxiosGet.mockResolvedValue({ data: Buffer.from('data'), headers: {} })

    const result = await service.fetchAsBase64('https://example.com/logo')

    expect(result).toBeNull()
  })

  it('returns null for unsupported formats (svg, octet-stream)', async () => {
    for (const mimeType of ['image/svg+xml', 'application/octet-stream']) {
      mockAxiosGet.mockResolvedValue({ data: Buffer.from('data'), headers: { 'content-type': mimeType } })
      expect(await service.fetchAsBase64('https://example.com/logo')).toBeNull()
    }
  })

  it('returns null when request fails', async () => {
    mockAxiosGet.mockRejectedValue(new Error('timeout'))

    expect(await service.fetchAsBase64('https://example.com/broken.png')).toBeNull()
  })

  it('returns null when sharp conversion fails', async () => {
    mockAxiosGet.mockResolvedValue({
      data: Buffer.from('bad-webp'),
      headers: { 'content-type': 'image/webp' },
    })
    mockSharp.mockReturnValue({ png: jest.fn().mockReturnValue({ toBuffer: jest.fn().mockRejectedValue(new Error('corrupt')) }) })

    expect(await service.fetchAsBase64('https://example.com/logo.webp')).toBeNull()
  })
})
