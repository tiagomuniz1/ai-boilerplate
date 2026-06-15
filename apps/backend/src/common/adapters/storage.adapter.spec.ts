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

  it('throws InternalServerErrorException when AWS_S3_BUCKET is missing', async () => {
    ;(getEnvConfig as jest.Mock).mockReturnValue({ AWS_S3_BUCKET: undefined, AWS_REGION: 'us-east-1' })
    const adapter = new StorageAdapter()

    await expect(adapter.upload(Buffer.from('data'), 'path/file.jpg', 'image/jpeg')).rejects.toThrow(
      InternalServerErrorException,
    )
    expect(mockSend).not.toHaveBeenCalled()
  })

  it('throws InternalServerErrorException when AWS_REGION is missing', async () => {
    ;(getEnvConfig as jest.Mock).mockReturnValue({ AWS_S3_BUCKET: 'test-bucket', AWS_REGION: undefined })
    const adapter = new StorageAdapter()

    await expect(adapter.upload(Buffer.from('data'), 'path/file.jpg', 'image/jpeg')).rejects.toThrow(
      InternalServerErrorException,
    )
    expect(mockSend).not.toHaveBeenCalled()
  })

  it('uploads file to S3 and returns public URL', async () => {
    const adapter = new StorageAdapter()

    const url = await adapter.upload(Buffer.from('image-data'), 'clinics/uuid/logo.jpg', 'image/jpeg')

    expect(mockSend).toHaveBeenCalled()
    expect(url).toBe('https://test-bucket.s3.us-east-1.amazonaws.com/clinics/uuid/logo.jpg')
  })

  it('rethrows S3 client errors', async () => {
    mockSend.mockRejectedValue(new Error('S3 failure'))
    const adapter = new StorageAdapter()

    await expect(adapter.upload(Buffer.from('data'), 'path/file.jpg', 'image/jpeg')).rejects.toThrow('S3 failure')
  })
})
