import * as fs from 'fs'
import * as path from 'path'
import { NotFoundException } from '@nestjs/common'
import { LocalStorageAdapter } from './local-storage.adapter'

jest.mock('fs')

const mockFs = fs as jest.Mocked<typeof fs>

describe('LocalStorageAdapter', () => {
  let adapter: LocalStorageAdapter

  beforeEach(() => {
    jest.clearAllMocks()
    adapter = new LocalStorageAdapter()
  })

  describe('upload — public', () => {
    it('creates the directory and writes the file under uploads/', async () => {
      const buffer = Buffer.from('image-data')
      await adapter.upload(buffer, 'clinics/uuid-1/logo.png', 'image/png', true)

      expect(mockFs.mkdirSync).toHaveBeenCalledWith(
        expect.stringContaining(path.join('uploads', 'clinics', 'uuid-1')),
        { recursive: true },
      )
      expect(mockFs.writeFileSync).toHaveBeenCalledWith(
        expect.stringContaining(path.join('uploads', 'clinics', 'uuid-1', 'logo.png')),
        buffer,
      )
    })

    it('returns a localhost URL with the file path', async () => {
      const url = await adapter.upload(Buffer.from(''), 'clinics/uuid-1/logo.jpg', 'image/jpeg', true)

      expect(url).toMatch(/^http:\/\/localhost:\d+\/uploads\/clinics\/uuid-1\/logo\.jpg$/)
    })

    it('uses PORT env variable in the returned URL', async () => {
      process.env.PORT = '4000'
      const url = await adapter.upload(Buffer.from(''), 'clinics/uuid-1/logo.jpg', 'image/jpeg', true)
      delete process.env.PORT

      expect(url).toContain('localhost:4000')
    })
  })

  describe('upload — private', () => {
    it('writes the file under uploads-private/ instead of uploads/', async () => {
      const buffer = Buffer.from('exam-data')
      await adapter.upload(buffer, 'exam-results/clinic/request/result.pdf', 'application/pdf', false)

      expect(mockFs.mkdirSync).toHaveBeenCalledWith(
        expect.stringContaining(path.join('uploads-private', 'exam-results', 'clinic', 'request')),
        { recursive: true },
      )
      expect(mockFs.writeFileSync).toHaveBeenCalledWith(
        expect.stringContaining(path.join('uploads-private', 'exam-results', 'clinic', 'request', 'result.pdf')),
        buffer,
      )
    })

    it('returns the raw file path instead of a public URL', async () => {
      const key = await adapter.upload(
        Buffer.from(''),
        'exam-results/clinic/request/result.pdf',
        'application/pdf',
        false,
      )

      expect(key).toBe('exam-results/clinic/request/result.pdf')
    })
  })

  describe('download', () => {
    it('reads the file from uploads-private/', async () => {
      mockFs.existsSync.mockReturnValue(true)
      mockFs.readFileSync.mockReturnValue(Buffer.from('file-content'))

      const buffer = await adapter.download('exam-results/clinic/request/result.pdf')

      expect(mockFs.existsSync).toHaveBeenCalledWith(
        expect.stringContaining(path.join('uploads-private', 'exam-results', 'clinic', 'request', 'result.pdf')),
      )
      expect(buffer.toString()).toBe('file-content')
    })

    it('throws NotFoundException when the file does not exist', async () => {
      mockFs.existsSync.mockReturnValue(false)

      await expect(adapter.download('missing.pdf')).rejects.toThrow(NotFoundException)
    })
  })
})
