// Spec separada que mocka o pdfmake para capturar as políticas de acesso
// registradas no onModuleInit sem depender do pdfmake chamá-las por dentro.
jest.mock('pdfmake/js/index.js', () => ({
  addFonts: jest.fn(),
  setLocalAccessPolicy: jest.fn(),
  setUrlAccessPolicy: jest.fn(),
  createPdf: jest.fn(),
}))

// eslint-disable-next-line @typescript-eslint/no-require-imports
const pdfmake = require('pdfmake/js/index.js')
import { VaccineIndicationPdfBuilderService } from '../services/vaccine-indication-pdf-builder.service'

describe('VaccineIndicationPdfBuilderService — políticas de acesso', () => {
  beforeEach(() => {
    jest.clearAllMocks()
    new VaccineIndicationPdfBuilderService().onModuleInit()
  })

  // O snapshot pode carregar URL de logo; buscar recurso externo na hora de
  // renderizar transformaria o PDF em requisição de rede a partir de dado
  // gravado no banco.
  it('bloqueia URL externa', () => {
    const urlPolicy: () => boolean = (pdfmake.setUrlAccessPolicy as jest.Mock).mock.calls[0][0]
    expect(urlPolicy()).toBe(false)
  })

  it('libera acesso local, para as fontes', () => {
    const localPolicy: () => boolean = (pdfmake.setLocalAccessPolicy as jest.Mock).mock.calls[0][0]
    expect(localPolicy()).toBe(true)
  })
})
