jest.mock('../hooks/use-patient-medical-history.hook')
jest.mock('../hooks/use-medical-record.hook')

import { screen, waitFor } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { MedicalRecordFieldType } from '@app/shared'
import { renderWithProviders } from '@/tests/utils/render-with-providers'
import { usePatientMedicalHistory } from '../hooks/use-patient-medical-history.hook'
import { useMedicalRecord } from '../hooks/use-medical-record.hook'
import { PatientMedicalHistory } from './patient-medical-history'
import type { IMedicalRecordModel } from '../types/medical-record-model.types'

const mockUseHistory = usePatientMedicalHistory as jest.Mock
const mockUseRecord = useMedicalRecord as jest.Mock

function makeRecord(id: string, overrides: Partial<IMedicalRecordModel> = {}): IMedicalRecordModel {
  return {
    id,
    appointmentId: `appt-${id}`,
    patientId: 'patient-uuid',
    patientName: 'Ana Lima',
    doctorId: 'doctor-uuid',
    doctorName: 'Dr. João',
    specialtyId: 'spec-uuid',
    specialtyName: 'Cardiologia',
    schema: [{ key: 'symptom', label: 'Sintoma', type: MedicalRecordFieldType.TEXT, required: false, order: 0, options: null, placeholder: null, helpText: null }],
    data: { symptom: 'Febre' },
    notes: null,
    createdAt: new Date('2024-03-15T10:00:00Z'),
    updatedAt: new Date('2024-03-15T10:00:00Z'),
    ...overrides,
  }
}

describe('PatientMedicalHistory', () => {
  beforeEach(() => {
    jest.clearAllMocks()
    mockUseRecord.mockReturnValue({ data: null, isLoading: false, isError: false })
  })

  it('renders skeleton while loading', () => {
    mockUseHistory.mockReturnValue({ data: null, isLoading: true, isError: false })
    renderWithProviders(<PatientMedicalHistory patientId="patient-uuid" />)
    expect(screen.getByTestId('patient-history-skeleton')).toBeInTheDocument()
  })

  it('renders error state on failure', () => {
    mockUseHistory.mockReturnValue({ data: null, isLoading: false, isError: true })
    renderWithProviders(<PatientMedicalHistory patientId="patient-uuid" />)
    expect(screen.getByTestId('patient-history-error')).toBeInTheDocument()
  })

  it('renders empty message when no records', () => {
    mockUseHistory.mockReturnValue({
      data: { data: [], total: 0, page: 1, limit: 10 },
      isLoading: false,
      isError: false,
    })
    renderWithProviders(<PatientMedicalHistory patientId="patient-uuid" />)
    expect(screen.getByTestId('patient-history-empty')).toBeInTheDocument()
  })

  it('renders history cards for each record', () => {
    mockUseHistory.mockReturnValue({
      data: { data: [makeRecord('r1'), makeRecord('r2')], total: 2, page: 1, limit: 10 },
      isLoading: false,
      isError: false,
    })
    renderWithProviders(<PatientMedicalHistory patientId="patient-uuid" />)
    expect(screen.getAllByTestId('history-card')).toHaveLength(2)
  })

  it('shows date and specialty on each card', () => {
    mockUseHistory.mockReturnValue({
      data: { data: [makeRecord('r1')], total: 1, page: 1, limit: 10 },
      isLoading: false,
      isError: false,
    })
    renderWithProviders(<PatientMedicalHistory patientId="patient-uuid" />)
    expect(screen.getByTestId('history-card-specialty')).toHaveTextContent('Cardiologia')
    expect(screen.getByTestId('history-card-doctor')).toHaveTextContent('Dr. João')
  })

  it('opens record detail modal when card is clicked', async () => {
    const record = makeRecord('r1')
    mockUseHistory.mockReturnValue({
      data: { data: [record], total: 1, page: 1, limit: 10 },
      isLoading: false,
      isError: false,
    })
    mockUseRecord.mockReturnValue({
      data: record,
      isLoading: false,
      isError: false,
    })

    renderWithProviders(<PatientMedicalHistory patientId="patient-uuid" />)
    await userEvent.click(screen.getByTestId('history-card'))

    await waitFor(() => {
      expect(screen.getByTestId('medical-record-view')).toBeInTheDocument()
    })
  })

  it('shows pagination when total exceeds limit', () => {
    mockUseHistory.mockReturnValue({
      data: { data: [makeRecord('r1')], total: 25, page: 1, limit: 10 },
      isLoading: false,
      isError: false,
    })
    renderWithProviders(<PatientMedicalHistory patientId="patient-uuid" />)
    expect(screen.getByTestId('history-page-info')).toBeInTheDocument()
    expect(screen.getByTestId('history-next-page')).not.toBeDisabled()
    expect(screen.getByTestId('history-prev-page')).toBeDisabled()
  })

  it('does not show pagination for single page', () => {
    mockUseHistory.mockReturnValue({
      data: { data: [makeRecord('r1')], total: 5, page: 1, limit: 10 },
      isLoading: false,
      isError: false,
    })
    renderWithProviders(<PatientMedicalHistory patientId="patient-uuid" />)
    expect(screen.queryByTestId('history-page-info')).not.toBeInTheDocument()
  })
})
