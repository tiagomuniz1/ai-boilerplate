import { Injectable, Logger } from '@nestjs/common'
import axios from 'axios'
import sharp from 'sharp'

const NATIVE_MIME_TYPES = ['image/png', 'image/jpeg', 'image/jpg']
const CONVERTIBLE_MIME_TYPES = ['image/webp']

@Injectable()
export class LogoFetcherService {
  private readonly logger = new Logger(LogoFetcherService.name)

  async fetchAsBase64(url: string): Promise<string | null> {
    try {
      const response = await axios.get<ArrayBuffer>(url, {
        responseType: 'arraybuffer',
        timeout: 4000,
      })
      const contentType = (response.headers['content-type'] as string | undefined) ?? ''
      const mimeType = contentType.split(';')[0].trim().toLowerCase()

      let imageBuffer = Buffer.from(response.data)

      if (NATIVE_MIME_TYPES.includes(mimeType)) {
        // Parse the bytes before trusting the declared type. The upload endpoint
        // only validates `file.mimetype`, which the client sends, so a file that
        // merely claims to be a PNG reaches this point intact — and pdfmake
        // answers a corrupt image with an exception that takes down the whole
        // document. A clinic with one bad logo would lose every PDF it issues:
        // prescriptions, atestados and exam requests alike.
        await sharp(imageBuffer).metadata()
        return `data:${mimeType};base64,${imageBuffer.toString('base64')}`
      }

      if (CONVERTIBLE_MIME_TYPES.includes(mimeType)) {
        const converted = await sharp(imageBuffer).png().toBuffer()
        return `data:image/png;base64,${converted.toString('base64')}`
      }

      this.logger.warn('Unsupported logo format — generating PDF without logo', {
        context: LogoFetcherService.name,
        mimeType,
        url,
      })
      return null
    } catch {
      this.logger.warn('Could not read the clinic logo — generating PDF without logo', {
        context: LogoFetcherService.name,
        url,
      })
      return null
    }
  }
}
