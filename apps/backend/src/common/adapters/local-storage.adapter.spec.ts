import * as fs from 'fs'
import * as path from 'path'
import { LocalStorageAdapter } from './local-storage.adapter'

jest.mock('fs')

const mockFs = fs as jest.Mocked<typeof fs>

describe('LocalStorageAdapter', () => {
  let adapter: LocalStorageAdapter

  beforeEach(() => {
    jest.clearAllMocks()
    adapter = new LocalStorageAdapter()
  })

  it('creates the directory and writes the file', async () => {
    const buffer = Buffer.from('image-data')
    await adapter.upload(buffer, 'clinics/uuid-1/logo.png', 'image/png')

    expect(mockFs.mkdirSync).toHaveBeenCalledWith(
      expect.stringContaining(path.join('clinics', 'uuid-1')),
      { recursive: true },
    )
    expect(mockFs.writeFileSync).toHaveBeenCalledWith(
      expect.stringContaining(path.join('clinics', 'uuid-1', 'logo.png')),
      buffer,
    )
  })

  it('returns a localhost URL with the file path', async () => {
    const url = await adapter.upload(Buffer.from(''), 'clinics/uuid-1/logo.jpg', 'image/jpeg')

    expect(url).toMatch(/^http:\/\/localhost:\d+\/uploads\/clinics\/uuid-1\/logo\.jpg$/)
  })

  it('uses PORT env variable in the returned URL', async () => {
    process.env.PORT = '4000'
    const url = await adapter.upload(Buffer.from(''), 'clinics/uuid-1/logo.jpg', 'image/jpeg')
    delete process.env.PORT

    expect(url).toContain('localhost:4000')
  })
})
