import { Injectable, NotFoundException } from '@nestjs/common'
import { DataSource } from 'typeorm'
import { BaseUseCase } from '../../../common/base.use-case'
import { IStorageAdapter } from '../../../common/adapters/storage.adapter.interface'
import { ClinicAssetType } from '../../../common/services/clinic-asset-url.service'
import { IClinicsRepository } from '../repositories/clinics.repository.interface'
import { Clinic } from '../entities/clinic.entity'

export interface ClinicAssetFile {
  buffer: Buffer
  contentType: string
}

const EXT_TO_CONTENT_TYPE: Record<string, string> = {
  jpg: 'image/jpeg',
  jpeg: 'image/jpeg',
  png: 'image/png',
  webp: 'image/webp',
  svg: 'image/svg+xml',
  ico: 'image/x-icon',
}

@Injectable()
export class StreamClinicAssetUseCase extends BaseUseCase {
  constructor(
    dataSource: DataSource,
    private readonly clinicsRepository: IClinicsRepository,
    private readonly storageAdapter: IStorageAdapter,
  ) {
    super(dataSource)
  }

  async execute(slug: string, type: ClinicAssetType): Promise<ClinicAssetFile> {
    const clinic = await this.clinicsRepository.findBySlug(slug)
    if (!clinic) throw new NotFoundException('Clinic not found')

    const path = this.pathFor(clinic, type)
    if (!path) throw new NotFoundException('Asset not found')

    const buffer = await this.storageAdapter.download(path)
    return { buffer, contentType: this.contentTypeFor(path) }
  }

  private pathFor(clinic: Clinic, type: ClinicAssetType): string | null {
    if (type === 'logo') return clinic.logoPath
    if (type === 'logo-dark') return clinic.logoDarkPath
    return clinic.faviconPath
  }

  private contentTypeFor(path: string): string {
    const ext = path.slice(path.lastIndexOf('.') + 1).toLowerCase()
    return EXT_TO_CONTENT_TYPE[ext] ?? 'application/octet-stream'
  }
}
