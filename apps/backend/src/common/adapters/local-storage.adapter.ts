import { Injectable, Logger } from '@nestjs/common'
import * as fs from 'fs'
import * as path from 'path'
import { IStorageAdapter } from './storage.adapter.interface'

@Injectable()
export class LocalStorageAdapter implements IStorageAdapter {
  private readonly logger = new Logger(LocalStorageAdapter.name)
  private readonly uploadsDir: string

  constructor() {
    this.uploadsDir = path.join(process.cwd(), 'uploads')
  }

  async upload(buffer: Buffer, filePath: string, _mimeType: string): Promise<string> {
    const fullPath = path.join(this.uploadsDir, filePath)
    fs.mkdirSync(path.dirname(fullPath), { recursive: true })
    fs.writeFileSync(fullPath, buffer)
    this.logger.debug(`File saved locally: ${fullPath}`)
    const port = process.env.PORT ?? '3001'
    return `http://localhost:${port}/uploads/${filePath}`
  }
}
