import { Injectable, Logger, NotFoundException } from '@nestjs/common'
import * as fs from 'fs'
import * as path from 'path'
import { IStorageAdapter } from './storage.adapter.interface'

@Injectable()
export class LocalStorageAdapter implements IStorageAdapter {
  private readonly logger = new Logger(LocalStorageAdapter.name)
  private readonly uploadsDir: string
  // Private files live outside `uploadsDir` on purpose — `main.ts` serves the whole
  // `uploads/` tree as static assets, so anything private must never be written there.
  private readonly privateUploadsDir: string

  constructor() {
    this.uploadsDir = path.join(process.cwd(), 'uploads')
    this.privateUploadsDir = path.join(process.cwd(), 'uploads-private')
  }

  async upload(buffer: Buffer, filePath: string, _mimeType: string, isPublic: boolean): Promise<string> {
    const baseDir = isPublic ? this.uploadsDir : this.privateUploadsDir
    const fullPath = path.join(baseDir, filePath)
    fs.mkdirSync(path.dirname(fullPath), { recursive: true })
    fs.writeFileSync(fullPath, buffer)
    this.logger.debug(`File saved locally: ${fullPath}`)

    if (!isPublic) return filePath

    const port = process.env.PORT ?? '3001'
    return `http://localhost:${port}/uploads/${filePath}`
  }

  async download(filePath: string): Promise<Buffer> {
    const fullPath = path.join(this.privateUploadsDir, filePath)
    if (!fs.existsSync(fullPath)) throw new NotFoundException('File not found')
    return fs.readFileSync(fullPath)
  }
}
