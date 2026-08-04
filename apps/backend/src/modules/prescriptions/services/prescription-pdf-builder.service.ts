import { Injectable, OnModuleInit } from '@nestjs/common'
import * as path from 'path'
import { COUNCIL_TYPE_LABELS, PrescriptionSnapshot } from '@app/shared'

// pdfmake 0.3.x server-side singleton — configured once at module init
// eslint-disable-next-line @typescript-eslint/no-require-imports
const pdfmake = require('pdfmake/js/index.js')

const MONTHS_PT = [
  'janeiro', 'fevereiro', 'março', 'abril', 'maio', 'junho',
  'julho', 'agosto', 'setembro', 'outubro', 'novembro', 'dezembro',
]

@Injectable()
export class PrescriptionPdfBuilderService implements OnModuleInit {
  onModuleInit() {
    const pdfmakeDir = path.dirname(require.resolve('pdfmake/package.json'))
    const fontDir = path.join(pdfmakeDir, 'build', 'fonts', 'Roboto')

    pdfmake.addFonts({
      Roboto: {
        normal: path.join(fontDir, 'Roboto-Regular.ttf'),
        bold: path.join(fontDir, 'Roboto-Medium.ttf'),
        italics: path.join(fontDir, 'Roboto-Italic.ttf'),
        bolditalics: path.join(fontDir, 'Roboto-MediumItalic.ttf'),
      },
    })
    pdfmake.setLocalAccessPolicy(() => true)
    pdfmake.setUrlAccessPolicy(() => false)
  }

  async build(
    snapshot: PrescriptionSnapshot,
    logoBase64: string | null,
    verificationUrl: string,
  ): Promise<Buffer> {
    const docDefinition = this.buildDocDefinition(snapshot, logoBase64, verificationUrl)
    return pdfmake.createPdf(docDefinition).getBuffer()
  }

  private buildDocDefinition(
    snapshot: PrescriptionSnapshot,
    logoBase64: string | null,
    verificationUrl: string,
  ) {
    const content: object[] = []

    content.push(...this.buildHeader(snapshot, logoBase64))
    content.push({ text: 'Receituário', style: 'title', alignment: 'center', margin: [0, 20, 0, 16] })
    content.push(...this.buildPatientBlock(snapshot))
    content.push(...this.buildItems(snapshot))
    if (snapshot.notes) content.push(...this.buildNotes(snapshot.notes))
    content.push(...this.buildFooter(snapshot, verificationUrl))

    return {
      content,
      defaultStyle: { font: 'Roboto', fontSize: 10, lineHeight: 1.4 },
      styles: {
        title: { fontSize: 16, bold: true },
        sectionLabel: { fontSize: 10, bold: true, margin: [0, 12, 0, 4] },
        clinicName: { fontSize: 13, bold: true },
        footerCity: { fontSize: 10, margin: [0, 24, 0, 32] },
      },
      pageMargins: [50, 50, 50, 50],
    }
  }

  private buildHeader(snapshot: PrescriptionSnapshot, logoBase64: string | null): object[] {
    const clinicLines: object[] = [
      { text: snapshot.clinic.name, style: 'clinicName' },
    ]

    const addr = snapshot.clinic.address
    if (addr) {
      const streetLine = [addr.street, addr.number, addr.complement].filter(Boolean).join(', ')
      const cityLine = [addr.neighborhood, addr.city, addr.state].filter(Boolean).join(' — ')
      if (streetLine) clinicLines.push({ text: streetLine, fontSize: 9 })
      if (cityLine) clinicLines.push({ text: cityLine, fontSize: 9 })
      if (addr.zipCode) clinicLines.push({ text: `CEP ${addr.zipCode}`, fontSize: 9 })
    }

    const safeLogoBase64 = logoBase64?.startsWith('data:image/') ? logoBase64 : null

    if (safeLogoBase64) {
      return [
        {
          columns: [
            { image: safeLogoBase64, width: 150 },
            { stack: clinicLines },
          ],
          columnGap: 24,
          margin: [0, 0, 0, 4],
        },
        { canvas: [{ type: 'line', x1: 0, y1: 0, x2: 495, y2: 0, lineWidth: 0.5, lineColor: '#cccccc' }] },
      ]
    }

    return [
      { stack: clinicLines, margin: [0, 0, 0, 4] },
      { canvas: [{ type: 'line', x1: 0, y1: 0, x2: 495, y2: 0, lineWidth: 0.5, lineColor: '#cccccc' }] },
    ]
  }

  private buildPatientBlock(snapshot: PrescriptionSnapshot): object[] {
    const cpfFormatted = this.formatCpf(snapshot.patient.documentNumber)
    return [
      { text: 'Paciente', style: 'sectionLabel' },
      { text: snapshot.patient.name },
      { text: `CPF: ${cpfFormatted}`, margin: [0, 0, 0, 8] },
    ]
  }

  private buildItems(snapshot: PrescriptionSnapshot): object[] {
    if (snapshot.items.length === 0) return []

    const header: object = { text: 'Medicamentos', style: 'sectionLabel' }
    const items = snapshot.items.map((item, index) => {
      const baseName = item.name
      const nameText = item.dosage ? `${baseName} ${item.dosage}` : baseName
      const quantityText = item.quantity ? `Quantidade: ${item.quantity}` : null

      return {
        margin: [0, 0, 0, 8],
        stack: [
          { text: `${index + 1}. ${nameText}`, bold: true },
          ...(quantityText ? [{ text: quantityText, margin: [12, 2, 0, 0], fontSize: 9, color: '#555555' }] : []),
          { text: item.instructions, margin: [12, 2, 0, 0] },
        ],
      }
    })

    return [header, ...items]
  }

  private buildNotes(notes: string): object[] {
    return [
      { text: 'Observações', style: 'sectionLabel' },
      { text: notes, margin: [0, 0, 0, 8] },
    ]
  }

  private buildFooter(snapshot: PrescriptionSnapshot, verificationUrl: string): object[] {
    const issuedAt = new Date(snapshot.issuedAt)
    const city = snapshot.clinic.address?.city ?? null
    const dateFormatted = `${issuedAt.getUTCDate()} de ${MONTHS_PT[issuedAt.getUTCMonth()]} de ${issuedAt.getUTCFullYear()}`
    const cityDateLine = city ? `${city}, ${dateFormatted}` : dateFormatted

    const specialtyLine = snapshot.professional.specialtyName
      ? { text: snapshot.professional.specialtyName, fontSize: 9 }
      : null

    const councilLabel = COUNCIL_TYPE_LABELS[snapshot.professional.councilType]

    const footerStack: object[] = [
      { text: cityDateLine, style: 'footerCity' },
      { canvas: [{ type: 'line', x1: 0, y1: 0, x2: 200, y2: 0, lineWidth: 0.5 }], margin: [0, 0, 0, 4] },
      { text: snapshot.professional.name, bold: true },
      {
        text: `${councilLabel} ${snapshot.professional.registrationNumber}${snapshot.professional.registryNumber ? ` · RQE ${snapshot.professional.registryNumber}` : ''}`,
        fontSize: 9,
      },
    ]

    if (specialtyLine) footerStack.push(specialtyLine)

    // QR pinned to the bottom-right corner (absolute position, A4 595.28 x 841.89, margins 50)
    footerStack.push(...this.buildVerificationQr(verificationUrl))

    return footerStack
  }

  private buildVerificationQr(verificationUrl: string): object[] {
    const qrSize = 100
    const rightEdge = 595.28 - 50 // page width minus right margin
    return [
      {
        qr: verificationUrl,
        fit: qrSize,
        absolutePosition: { x: rightEdge - qrSize, y: 675 },
      },
      {
        text: 'Verifique a autenticidade desta receita',
        fontSize: 7,
        color: '#555555',
        alignment: 'right',
        lineHeight: 1,
        width: 200,
        absolutePosition: { x: rightEdge - 200, y: 775 },
      },
    ]
  }

  private formatCpf(cpf: string | null): string {
    if (!cpf) return 'Não informado'
    const digits = cpf.replace(/\D/g, '')
    if (digits.length !== 11) return cpf
    return `${digits.slice(0, 3)}.${digits.slice(3, 6)}.${digits.slice(6, 9)}-${digits.slice(9)}`
  }
}
