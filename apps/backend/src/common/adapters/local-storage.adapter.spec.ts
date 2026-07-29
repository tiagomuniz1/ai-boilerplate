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

  describe('upload', () => {
    it('creates the directory and writes the file under uploads-private/', async () => {
      const buffer = Buffer.from('image-data')
      await adapter.upload(buffer, 'clinics/uuid-1/logo.png', 'image/png')

      expect(mockFs.mkdirSync).toHaveBeenCalledWith(
        expect.stringContaining(path.join('uploads-private', 'clinics', 'uuid-1')),
        { recursive: true },
      )
      expect(mockFs.writeFileSync).toHaveBeenCalledWith(
        expect.stringContaining(path.join('uploads-private', 'clinics', 'uuid-1', 'logo.png')),
        buffer,
      )
    })

    it('returns the object key (path), not a URL', async () => {
      const key = await adapter.upload(Buffer.from(''), 'clinics/uuid-1/logo.jpg', 'image/jpeg')

      expect(key).toBe('clinics/uuid-1/logo.jpg')
    })

    it('writes exam results under uploads-private/ and returns the key', async () => {
      const buffer = Buffer.from('exam-data')
      const key = await adapter.upload(buffer, 'exam-results/clinic/request/result.pdf', 'application/pdf')

      expect(mockFs.writeFileSync).toHaveBeenCalledWith(
        expect.stringContaining(path.join('uploads-private', 'exam-results', 'clinic', 'request', 'result.pdf')),
        buffer,
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

  describe('remove', () => {
    it('deletes the file from uploads-private/', async () => {
      mockFs.existsSync.mockReturnValue(true)

      await adapter.remove('exam-results/clinic/request/result.pdf')

      expect(mockFs.unlinkSync).toHaveBeenCalledWith(
        expect.stringContaining(path.join('uploads-private', 'exam-results', 'clinic', 'request', 'result.pdf')),
      )
    })

    it('resolves without error when the file does not exist (idempotent)', async () => {
      mockFs.existsSync.mockReturnValue(false)

      await expect(adapter.remove('missing.jpg')).resolves.toBeUndefined()
      expect(mockFs.unlinkSync).not.toHaveBeenCalled()
    })
  })
})
