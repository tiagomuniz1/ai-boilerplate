// Separate spec that mocks pdfmake so we can capture and invoke the access policy callbacks
// registered in onModuleInit without needing pdfmake to call them internally.
jest.mock('pdfmake/js/index.js', () => ({
  addFonts: jest.fn(),
  setLocalAccessPolicy: jest.fn(),
  setUrlAccessPolicy: jest.fn(),
  createPdf: jest.fn(),
}))

// eslint-disable-next-line @typescript-eslint/no-require-imports
const pdfmake = require('pdfmake/js/index.js')
import { ExamRequestPdfBuilderService } from '../services/exam-request-pdf-builder.service'

describe('ExamRequestPdfBuilderService — onModuleInit access policies', () => {
  let service: ExamRequestPdfBuilderService

  beforeEach(() => {
    jest.clearAllMocks()
    service = new ExamRequestPdfBuilderService()
    service.onModuleInit()
  })

  it('registers a URL access policy that always returns false (blocks external URLs)', () => {
    const urlPolicy: () => boolean = (pdfmake.setUrlAccessPolicy as jest.Mock).mock.calls[0][0]
    expect(urlPolicy()).toBe(false)
  })

  it('registers a local access policy that always returns true (allows font files)', () => {
    const localPolicy: () => boolean = (pdfmake.setLocalAccessPolicy as jest.Mock).mock.calls[0][0]
    expect(localPolicy()).toBe(true)
  })
})
