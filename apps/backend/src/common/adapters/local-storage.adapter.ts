import { Injectable, Logger, NotFoundException } from '@nestjs/common'
import * as fs from 'fs'
import * as path from 'path'
import { IStorageAdapter } from './storage.adapter.interface'

@Injectable()
export class LocalStorageAdapter implements IStorageAdapter {
  private readonly logger = new Logger(LocalStorageAdapter.name)
  // Everything is private — stored under `uploads-private` and served by the backend via
  // `download()`. Nothing is written to the statically-served `uploads/` tree anymore.
  private readonly privateUploadsDir: string

  constructor() {
    this.privateUploadsDir = path.join(process.cwd(), 'uploads-private')
  }

  async upload(buffer: Buffer, filePath: string, _mimeType: string): Promise<string> {
    const fullPath = path.join(this.privateUploadsDir, filePath)
    fs.mkdirSync(path.dirname(fullPath), { recursive: true })
    fs.writeFileSync(fullPath, buffer)
    this.logger.debug(`File saved locally: ${fullPath}`)
    return filePath
  }

  async download(filePath: string): Promise<Buffer> {
    const fullPath = path.join(this.privateUploadsDir, filePath)
    if (!fs.existsSync(fullPath)) throw new NotFoundException('File not found')
    return fs.readFileSync(fullPath)
  }

  async remove(filePath: string): Promise<void> {
    const fullPath = path.join(this.privateUploadsDir, filePath)
    if (!fs.existsSync(fullPath)) return
    fs.unlinkSync(fullPath)
  }
}
