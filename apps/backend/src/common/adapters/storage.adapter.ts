import { Injectable, InternalServerErrorException, Logger } from '@nestjs/common'
import { GetObjectCommand, PutObjectCommand, S3Client } from '@aws-sdk/client-s3'
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

  // Files that are not public are uploaded with no ACL, which defaults to private
  // (bucket-owner-only) — the bucket policy only grants public read on `clinics/*`,
  // so anything else stays inaccessible without going through `download()` below.
  async upload(buffer: Buffer, path: string, mimeType: string, isPublic: boolean): Promise<string> {
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
          ...(isPublic ? { ACL: 'public-read' as const } : {}),
        }),
      )
    } catch (error) {
      this.logger.error('S3 upload failed', { path, mimeType, error })
      throw error
    }

    return isPublic ? `https://${this.bucket}.s3.${this.region}.amazonaws.com/${path}` : path
  }

  async download(path: string): Promise<Buffer> {
    if (!this.bucket || !this.region) {
      throw new InternalServerErrorException(
        'AWS_S3_BUCKET and AWS_REGION environment variables are required for file downloads',
      )
    }

    const client = new S3Client({ region: this.region })

    try {
      const response = await client.send(new GetObjectCommand({ Bucket: this.bucket, Key: path }))
      const bytes = await response.Body!.transformToByteArray()
      return Buffer.from(bytes)
    } catch (error) {
      this.logger.error('S3 download failed', { path, error })
      throw error
    }
  }
}
