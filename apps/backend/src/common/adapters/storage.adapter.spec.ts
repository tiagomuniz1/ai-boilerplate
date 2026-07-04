import { InternalServerErrorException } from '@nestjs/common'
import { StorageAdapter } from './storage.adapter'

jest.mock('../../config/env.config', () => ({
  getEnvConfig: jest.fn().mockReturnValue({
    DB_HOST: 'localhost',
    DB_PORT: 5432,
    DB_USER: 'user',
    DB_PASS: 'pass',
    DB_NAME: 'db',
    DB_SCHEMA: 'public',
    REDIS_HOST: 'localhost',
    REDIS_PORT: 6379,
    JWT_SECRET: 'secret',
    JWT_EXPIRATION: '900s',
    JWT_REFRESH_EXPIRATION: '7d',
    FRONTEND_URL: 'http://localhost:3000',
    AWS_S3_BUCKET: 'test-bucket',
    AWS_REGION: 'us-east-1',
  }),
}))

const mockSend = jest.fn()

jest.mock('@aws-sdk/client-s3', () => ({
  S3Client: jest.fn().mockImplementation(() => ({ send: mockSend })),
  PutObjectCommand: jest.fn().mockImplementation((params) => params),
  GetObjectCommand: jest.fn().mockImplementation((params) => params),
}))

import { getEnvConfig } from '../../config/env.config'

describe('StorageAdapter', () => {
  beforeEach(() => {
    jest.clearAllMocks()
    ;(getEnvConfig as jest.Mock).mockReturnValue({
      AWS_S3_BUCKET: 'test-bucket',
      AWS_REGION: 'us-east-1',
    })
    mockSend.mockResolvedValue(undefined)
  })

  describe('upload', () => {
    it('throws InternalServerErrorException when AWS_S3_BUCKET is missing', async () => {
      ;(getEnvConfig as jest.Mock).mockReturnValue({ AWS_S3_BUCKET: undefined, AWS_REGION: 'us-east-1' })
      const adapter = new StorageAdapter()

      await expect(adapter.upload(Buffer.from('data'), 'path/file.jpg', 'image/jpeg', true)).rejects.toThrow(
        InternalServerErrorException,
      )
      expect(mockSend).not.toHaveBeenCalled()
    })

    it('throws InternalServerErrorException when AWS_REGION is missing', async () => {
      ;(getEnvConfig as jest.Mock).mockReturnValue({ AWS_S3_BUCKET: 'test-bucket', AWS_REGION: undefined })
      const adapter = new StorageAdapter()

      await expect(adapter.upload(Buffer.from('data'), 'path/file.jpg', 'image/jpeg', true)).rejects.toThrow(
        InternalServerErrorException,
      )
      expect(mockSend).not.toHaveBeenCalled()
    })

    it('uploads public file to S3 with public-read ACL and returns public URL', async () => {
      const adapter = new StorageAdapter()

      const url = await adapter.upload(Buffer.from('image-data'), 'clinics/uuid/logo.jpg', 'image/jpeg', true)

      expect(mockSend).toHaveBeenCalled()
      expect(mockSend.mock.calls[0][0]).toMatchObject({ ACL: 'public-read' })
      expect(url).toBe('https://test-bucket.s3.us-east-1.amazonaws.com/clinics/uuid/logo.jpg')
    })

    it('uploads private file to S3 without any ACL and returns the object key', async () => {
      const adapter = new StorageAdapter()

      const key = await adapter.upload(
        Buffer.from('exam-data'),
        'exam-results/clinic/request/result.pdf',
        'application/pdf',
        false,
      )

      expect(mockSend).toHaveBeenCalled()
      expect(mockSend.mock.calls[0][0]).not.toHaveProperty('ACL')
      expect(key).toBe('exam-results/clinic/request/result.pdf')
    })

    it('rethrows S3 client errors', async () => {
      mockSend.mockRejectedValue(new Error('S3 failure'))
      const adapter = new StorageAdapter()

      await expect(adapter.upload(Buffer.from('data'), 'path/file.jpg', 'image/jpeg', true)).rejects.toThrow(
        'S3 failure',
      )
    })
  })

  describe('download', () => {
    it('throws InternalServerErrorException when AWS_S3_BUCKET is missing', async () => {
      ;(getEnvConfig as jest.Mock).mockReturnValue({ AWS_S3_BUCKET: undefined, AWS_REGION: 'us-east-1' })
      const adapter = new StorageAdapter()

      await expect(adapter.download('path/file.pdf')).rejects.toThrow(InternalServerErrorException)
      expect(mockSend).not.toHaveBeenCalled()
    })

    it('downloads the object and returns it as a Buffer', async () => {
      mockSend.mockResolvedValue({
        Body: { transformToByteArray: jest.fn().mockResolvedValue(new Uint8Array([1, 2, 3])) },
      })
      const adapter = new StorageAdapter()

      const buffer = await adapter.download('exam-results/clinic/request/result.pdf')

      expect(mockSend).toHaveBeenCalled()
      expect(buffer).toBeInstanceOf(Buffer)
      expect(Array.from(buffer)).toEqual([1, 2, 3])
    })

    it('rethrows S3 client errors', async () => {
      mockSend.mockRejectedValue(new Error('S3 failure'))
      const adapter = new StorageAdapter()

      await expect(adapter.download('path/file.pdf')).rejects.toThrow('S3 failure')
    })
  })
})
