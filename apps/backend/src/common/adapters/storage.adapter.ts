import { Injectable, InternalServerErrorException, Logger } from '@nestjs/common'
import { PutObjectCommand, S3Client } from '@aws-sdk/client-s3'
import { getEnvConfig } from '../../config/env.config'
import { IStorageAdapter } from './storage.adapter.interface'

@Injectable()
export class StorageAdapter implements IStorageAdapter {
  private readonly logger = new Logger(StorageAdapter.name)
  private readonly bucket: string | undefined
  private readonly region: string | undefined

  constructor() {
    const config = getEnvConfig()
    this.bucket = config.AWS_S3_BUCKET
    this.region = config.AWS_REGION
  }

  async upload(buffer: Buffer, path: string, mimeType: string): Promise<string> {
    if (!this.bucket || !this.region) {
      throw new InternalServerErrorException(
        'AWS_S3_BUCKET and AWS_REGION environment variables are required for file uploads',
      )
    }

    const client = new S3Client({ region: this.region })

    try {
      await client.send(
        new PutObjectCommand({
          Bucket: this.bucket,
          Key: path,
          Body: buffer,
          ContentType: mimeType,
          ACL: 'public-read',
        }),
      )
    } catch (error) {
      this.logger.error('S3 upload failed', { path, mimeType, error })
      throw error
    }

    return `https://${this.bucket}.s3.${this.region}.amazonaws.com/${path}`
  }
}
