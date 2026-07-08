import { Injectable } from '@nestjs/common'
import { getEnvConfig } from '../../config/env.config'

export type ClinicAssetType = 'logo' | 'logo-dark' | 'favicon'

/**
 * Builds the public delivery URL for a clinic branding asset. The bucket is private, so assets
 * are streamed by the backend at `GET /clinics/:slug/:type`. The `?v=` cache-buster changes when
 * the clinic is updated (e.g. a new logo overwrites the previous one at the same key).
 */
@Injectable()
export class ClinicAssetUrlService {
  private readonly baseUrl: string

  constructor() {
    this.baseUrl = getEnvConfig().PUBLIC_API_URL.replace(/\/+$/, '')
  }

  build(slug: string, type: ClinicAssetType, updatedAt: Date): string {
    const version = new Date(updatedAt).getTime()
    return `${this.baseUrl}/clinics/${slug}/${type}?v=${version}`
  }
}
