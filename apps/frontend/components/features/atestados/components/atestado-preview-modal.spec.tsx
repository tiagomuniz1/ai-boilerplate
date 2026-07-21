import { render, screen } from '@testing-library/react'
import { MedicalCertificateType } from '@app/shared'
import { AtestadoPreviewModal } from './atestado-preview-modal'
import type { IAtestadoModel } from '../types/atestado-model.types'

const makeLeaveAtestado = (overrides: Partial<IAtestadoModel> = {}): IAtestadoModel => ({
  id: 'cert-uuid',
  appointmentId: 'appt-uuid',
  patientId: 'patient-uuid',
  patientName: 'Maria Santos',
  professionalId: 'doctor-uuid',
  professionalName: 'Dr. João',
  type: MedicalCertificateType.LEAVE,
  daysOff: 3,
  startDate: new Date('2026-01-05'),
  cidCode: 'M54.5',
  attendanceDate: null,
  checkInTime: null,
  checkOutTime: null,
  observations: null,
  issuedAt: new Date('2026-06-28T10:00:00.000Z'),
  createdAt: new Date('2026-06-28T10:00:00.000Z'),
  ...overrides,
})

describe('AtestadoPreviewModal', () => {
  it('renders nothing when atestado is null', () => {
    const { container } = render(<AtestadoPreviewModal atestado={null} onClose={jest.fn()} />)
    expect(container).toBeEmptyDOMElement()
  })

  it('renders LEAVE body with plural "dias" and CID', () => {
    render(<AtestadoPreviewModal atestado={makeLeaveAtestado()} onClose={jest.fn()} />)
    expect(screen.getByTestId('atestado-preview-body')).toHaveTextContent('3 dias')
    expect(screen.getByTestId('atestado-preview-body')).toHaveTextContent('CID: M54.5')
  })

  it('renders LEAVE body with singular "dia" when daysOff is 1', () => {
    render(<AtestadoPreviewModal atestado={makeLeaveAtestado({ daysOff: 1 })} onClose={jest.fn()} />)
    expect(screen.getByTestId('atestado-preview-body')).toHaveTextContent('1 dia')
    expect(screen.getByTestId('atestado-preview-body')).not.toHaveTextContent('1 dias')
  })

  it('renders LEAVE body without CID when cidCode is null', () => {
    render(<AtestadoPreviewModal atestado={makeLeaveAtestado({ cidCode: null })} onClose={jest.fn()} />)
    expect(screen.getByTestId('atestado-preview-body')).not.toHaveTextContent('CID')
  })

  it('renders ATTENDANCE body with date and times', () => {
    const atestado = makeLeaveAtestado({
      type: MedicalCertificateType.ATTENDANCE,
      daysOff: null,
      startDate: null,
      cidCode: null,
      attendanceDate: new Date('2026-01-05'),
      checkInTime: '08:00',
      checkOutTime: '08:30',
    })
    render(<AtestadoPreviewModal atestado={atestado} onClose={jest.fn()} />)
    expect(screen.getByTestId('atestado-preview-body')).toHaveTextContent('08:00')
    expect(screen.getByTestId('atestado-preview-body')).toHaveTextContent('08:30')
  })

  it('renders observations when present', () => {
    render(<AtestadoPreviewModal atestado={makeLeaveAtestado({ observations: 'Repouso absoluto.' })} onClose={jest.fn()} />)
    expect(screen.getByTestId('atestado-preview-observations')).toHaveTextContent('Repouso absoluto.')
  })

  it('does not render observations section when null', () => {
    render(<AtestadoPreviewModal atestado={makeLeaveAtestado({ observations: null })} onClose={jest.fn()} />)
    expect(screen.queryByTestId('atestado-preview-observations')).not.toBeInTheDocument()
  })

  it('renders doctor name and patient name', () => {
    render(<AtestadoPreviewModal atestado={makeLeaveAtestado()} onClose={jest.fn()} />)
    expect(screen.getByTestId('atestado-preview-professional')).toHaveTextContent('Dr. João')
    expect(screen.getByTestId('atestado-preview-patient')).toHaveTextContent('Maria Santos')
  })
})
