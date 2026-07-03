import { Injectable, OnModuleInit } from '@nestjs/common'
import * as path from 'path'
import { MedicalCertificateSnapshot, MedicalCertificateType } from '@app/shared'

// pdfmake 0.3.x server-side singleton — configured once at module init
// eslint-disable-next-line @typescript-eslint/no-require-imports
const pdfmake = require('pdfmake/js/index.js')

const MONTHS_PT = [
  'janeiro', 'fevereiro', 'março', 'abril', 'maio', 'junho',
  'julho', 'agosto', 'setembro', 'outubro', 'novembro', 'dezembro',
]

@Injectable()
export class MedicalCertificatePdfBuilderService implements OnModuleInit {
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

  async build(snapshot: MedicalCertificateSnapshot, logoBase64: string | null): Promise<Buffer> {
    const docDefinition = this.buildDocDefinition(snapshot, logoBase64)
    return pdfmake.createPdf(docDefinition).getBuffer()
  }

  private buildDocDefinition(snapshot: MedicalCertificateSnapshot, logoBase64: string | null) {
    const content: object[] = []

    content.push(...this.buildHeader(snapshot, logoBase64))
    content.push({ text: 'Atestado Médico', style: 'title', alignment: 'center', margin: [0, 20, 0, 16] })
    content.push(...this.buildBody(snapshot))
    if (snapshot.observations) content.push(...this.buildObservations(snapshot.observations))
    content.push(...this.buildFooter(snapshot))

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

  private buildHeader(snapshot: MedicalCertificateSnapshot, logoBase64: string | null): object[] {
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

  private buildBody(snapshot: MedicalCertificateSnapshot): object[] {
    const cpfFormatted = this.formatCpf(snapshot.patient.documentNumber)

    if (snapshot.type === MedicalCertificateType.LEAVE) {
      const startDateFormatted = this.formatDateBR(snapshot.startDate!)
      const dayLabel = snapshot.daysOff === 1 ? 'dia' : 'dias'
      const lines: object[] = [
        {
          text: `Atesto, para os devidos fins, que o(a) paciente ${snapshot.patient.name} (CPF ${cpfFormatted}) necessita afastar-se de suas atividades por ${snapshot.daysOff} ${dayLabel}, a partir de ${startDateFormatted}.`,
          margin: [0, 0, 0, 8],
        },
      ]
      if (snapshot.cidCode) {
        lines.push({ text: `CID: ${snapshot.cidCode}.`, margin: [0, 0, 0, 8] })
      }
      return lines
    }

    const attendanceDateFormatted = this.formatDateBR(snapshot.attendanceDate!)
    return [
      {
        text: `Atesto, para os devidos fins, que o(a) paciente ${snapshot.patient.name} (CPF ${cpfFormatted}) compareceu a esta consulta em ${attendanceDateFormatted}, no período das ${snapshot.checkInTime} às ${snapshot.checkOutTime}.`,
        margin: [0, 0, 0, 8],
      },
    ]
  }

  private buildObservations(observations: string): object[] {
    return [
      { text: 'Observações', style: 'sectionLabel' },
      { text: observations, margin: [0, 0, 0, 8] },
    ]
  }

  private buildFooter(snapshot: MedicalCertificateSnapshot): object[] {
    const issuedAt = new Date(snapshot.issuedAt)
    const city = snapshot.clinic.address?.city ?? null
    const dateFormatted = `${issuedAt.getUTCDate()} de ${MONTHS_PT[issuedAt.getUTCMonth()]} de ${issuedAt.getUTCFullYear()}`
    const cityDateLine = city ? `${city}, ${dateFormatted}` : dateFormatted

    const specialtyLine = snapshot.doctor.specialtyName
      ? { text: snapshot.doctor.specialtyName, fontSize: 9 }
      : null

    const footerStack: object[] = [
      { text: cityDateLine, style: 'footerCity' },
      { canvas: [{ type: 'line', x1: 0, y1: 0, x2: 200, y2: 0, lineWidth: 0.5 }], margin: [0, 0, 0, 4] },
      { text: snapshot.doctor.name, bold: true },
      { text: `CRM ${snapshot.doctor.crmNumber}`, fontSize: 9 },
    ]

    if (specialtyLine) footerStack.push(specialtyLine)

    return footerStack
  }

  private formatDateBR(isoDate: string): string {
    const [year, month, day] = isoDate.split('-')
    return `${day}/${month}/${year}`
  }

  private formatCpf(cpf: string): string {
    const digits = cpf.replace(/\D/g, '')
    if (digits.length !== 11) return cpf
    return `${digits.slice(0, 3)}.${digits.slice(3, 6)}.${digits.slice(6, 9)}-${digits.slice(9)}`
  }
}
