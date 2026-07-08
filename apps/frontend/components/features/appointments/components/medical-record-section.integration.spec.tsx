jest.mock('@/components/features/medical-records/services/medical-records.service')
jest.mock('@/components/features/medical-record-templates/services/medical-record-templates.service')

import { screen, waitFor, within } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { AppointmentStatus, MedicalRecordFieldType } from '@app/shared'
import { medicalRecordsService } from '@/components/features/medical-records/services/medical-records.service'
import { medicalRecordTemplatesService } from '@/components/features/medical-record-templates/services/medical-record-templates.service'
import { renderWithProviders } from '@/tests/utils/render-with-providers'
import { MedicalRecordSection } from './medical-record-section'

const mockMedicalRecordsService = medicalRecordsService as jest.Mocked<typeof medicalRecordsService>
const mockTemplatesService = medicalRecordTemplatesService as jest.Mocked<typeof medicalRecordTemplatesService>

const makeTemplateDto = (overrides: object = {}) => ({
  id: 'tpl-uuid',
  specialtyId: 'spec-uuid',
  specialtyName: 'Cardiologia',
  name: 'Anamnese',
  sections: [],
  fields: [
    {
      key: 'complaint',
      label: 'Queixa',
      type: MedicalRecordFieldType.TEXT,
      required: false,
      order: 0,
      options: null,
      placeholder: null,
      helpText: null,
      canonical: false,
      canonicalKey: null,
      sectionKey: null,
    },
    {
      label: 'Notas extras',
      type: MedicalRecordFieldType.TEXTAREA,
      required: false,
      order: 1,
      options: null,
      placeholder: null,
      helpText: null,
      canonical: false,
      canonicalKey: null,
      sectionKey: null,
    },
  ],
  isActive: true,
  createdAt: new Date().toISOString(),
  updatedAt: new Date().toISOString(),
  ...overrides,
})

const makeRecordDto = (overrides: object = {}) => ({
  id: 'record-uuid',
  appointmentId: 'appt-uuid',
  patientId: 'patient-uuid',
  patientName: 'Patient One',
  doctorId: 'doctor-uuid',
  doctorName: 'Dr. Test',
  specialtyId: 'spec-uuid',
  specialtyName: 'Cardiologia',
  templateId: 'tpl-uuid',
  templateSchemaSnapshot: [
    {
      key: 'complaint',
      label: 'Queixa',
      type: MedicalRecordFieldType.TEXT,
      required: false,
      order: 0,
      options: null,
      placeholder: null,
      helpText: null,
      canonical: false,
      canonicalKey: null,
      sectionKey: null,
    },
  ],
  data: { complaint: 'Dor de cabeça' },
  notes: null,
  createdAt: new Date().toISOString(),
  updatedAt: new Date().toISOString(),
  ...overrides,
})

const defaultProps = {
  appointmentId: 'appt-uuid',
  specialtyId: 'spec-uuid',
  appointmentStatus: AppointmentStatus.SCHEDULED,
  canManage: true,
}

describe('MedicalRecordSection (integration)', () => {
  beforeEach(() => {
    jest.clearAllMocks()
    mockMedicalRecordsService.getByAppointment.mockResolvedValue(null)
    mockTemplatesService.getAll.mockResolvedValue({ data: [], total: 0, page: 1, limit: 1 })
  })

  it('shows fill-medical-record button when canManage and no record exists', async () => {
    renderWithProviders(<MedicalRecordSection {...defaultProps} />)
    await waitFor(() => {
      expect(screen.getByTestId('fill-medical-record-button')).toBeInTheDocument()
    })
  })

  it('does not show fill button when canManage is false', async () => {
    renderWithProviders(<MedicalRecordSection {...defaultProps} canManage={false} />)
    await waitFor(() => {
      expect(screen.queryByTestId('fill-medical-record-button')).not.toBeInTheDocument()
    })
  })

  it('fetches the generalist template when specialtyId is null', async () => {
    mockTemplatesService.getAll.mockResolvedValue({
      data: [makeTemplateDto({ specialtyId: null, specialtyName: null }) as any],
      total: 1,
      page: 1,
      limit: 1,
    })

    renderWithProviders(<MedicalRecordSection {...defaultProps} specialtyId={null} />)

    await waitFor(() => {
      expect(screen.getByTestId('fill-medical-record-button')).toBeInTheDocument()
    })

    expect(mockTemplatesService.getAll).toHaveBeenCalledWith({ generalist: true, limit: 1 })

    await userEvent.click(screen.getByTestId('fill-medical-record-button'))

    await waitFor(() => {
      expect(screen.getByTestId('medical-record-form-modal')).toBeInTheDocument()
    })
    expect(screen.queryByTestId('no-template-alert')).not.toBeInTheDocument()
  })

  it('shows medical record view inline when record exists', async () => {
    mockMedicalRecordsService.getByAppointment.mockResolvedValue(makeRecordDto() as any)
    renderWithProviders(<MedicalRecordSection {...defaultProps} />)
    await waitFor(() => {
      expect(screen.getByTestId('medical-record-view')).toBeInTheDocument()
    })
  })

  it('shows edit-medical-record button when canManage and record exists and not completed', async () => {
    mockMedicalRecordsService.getByAppointment.mockResolvedValue(makeRecordDto() as any)
    renderWithProviders(<MedicalRecordSection {...defaultProps} />)
    await waitFor(() => {
      expect(screen.getByTestId('edit-medical-record-button')).toBeInTheDocument()
    })
  })

  it('hides edit button when appointment is COMPLETED', async () => {
    mockMedicalRecordsService.getByAppointment.mockResolvedValue(makeRecordDto() as any)
    renderWithProviders(
      <MedicalRecordSection {...defaultProps} appointmentStatus={AppointmentStatus.COMPLETED} />,
    )
    await waitFor(() => {
      expect(screen.getByTestId('medical-record-view')).toBeInTheDocument()
    })
    expect(screen.queryByTestId('edit-medical-record-button')).not.toBeInTheDocument()
  })

  it('opens fill modal with form when fill button clicked', async () => {
    mockTemplatesService.getAll.mockResolvedValue({ data: [makeTemplateDto()], total: 1, page: 1, limit: 1 })
    renderWithProviders(<MedicalRecordSection {...defaultProps} />)
    await waitFor(() => expect(screen.getByTestId('fill-medical-record-button')).toBeInTheDocument())
    await userEvent.click(screen.getByTestId('fill-medical-record-button'))
    await waitFor(() => {
      expect(screen.getByTestId('medical-record-form')).toBeInTheDocument()
    })
  })

  it('shows skeleton while templates are loading', async () => {
    mockTemplatesService.getAll.mockReturnValue(new Promise(() => {}))
    renderWithProviders(<MedicalRecordSection {...defaultProps} />)
    await waitFor(() => expect(screen.getByTestId('fill-medical-record-button')).toBeInTheDocument())
    await userEvent.click(screen.getByTestId('fill-medical-record-button'))
    await waitFor(() => {
      expect(screen.getByTestId('medical-record-form-skeleton')).toBeInTheDocument()
    })
  })

  it('shows no-template alert when fill modal opened and no template exists', async () => {
    renderWithProviders(<MedicalRecordSection {...defaultProps} />)
    await waitFor(() => expect(screen.getByTestId('fill-medical-record-button')).toBeInTheDocument())
    await userEvent.click(screen.getByTestId('fill-medical-record-button'))
    await waitFor(() => {
      expect(screen.getByTestId('no-template-alert')).toBeInTheDocument()
    })
  })

  it('submitting fill form calls create medical record service', async () => {
    mockMedicalRecordsService.create.mockResolvedValue(makeRecordDto() as any)
    mockTemplatesService.getAll.mockResolvedValue({ data: [makeTemplateDto()], total: 1, page: 1, limit: 1 })
    renderWithProviders(<MedicalRecordSection {...defaultProps} />)
    await waitFor(() => expect(screen.getByTestId('fill-medical-record-button')).toBeInTheDocument())
    await userEvent.click(screen.getByTestId('fill-medical-record-button'))
    await waitFor(() => expect(screen.getByTestId('medical-record-form')).toBeInTheDocument())
    await userEvent.click(screen.getByTestId('medical-record-form-submit'))
    await waitFor(() => {
      expect(mockMedicalRecordsService.create).toHaveBeenCalled()
    })
  })

  it('shows 409 error when create fails with 409', async () => {
    mockMedicalRecordsService.create.mockRejectedValue({ status: 409 })
    mockTemplatesService.getAll.mockResolvedValue({ data: [makeTemplateDto()], total: 1, page: 1, limit: 1 })
    renderWithProviders(<MedicalRecordSection {...defaultProps} />)
    await waitFor(() => expect(screen.getByTestId('fill-medical-record-button')).toBeInTheDocument())
    await userEvent.click(screen.getByTestId('fill-medical-record-button'))
    await waitFor(() => expect(screen.getByTestId('medical-record-form')).toBeInTheDocument())
    await userEvent.click(screen.getByTestId('medical-record-form-submit'))
    await waitFor(() => {
      expect(screen.getByTestId('medical-record-form-error')).toHaveTextContent('Esta consulta já possui prontuário.')
    })
  })

  it('shows 422 error when create fails with 422', async () => {
    mockMedicalRecordsService.create.mockRejectedValue({ status: 422 })
    mockTemplatesService.getAll.mockResolvedValue({ data: [makeTemplateDto()], total: 1, page: 1, limit: 1 })
    renderWithProviders(<MedicalRecordSection {...defaultProps} />)
    await waitFor(() => expect(screen.getByTestId('fill-medical-record-button')).toBeInTheDocument())
    await userEvent.click(screen.getByTestId('fill-medical-record-button'))
    await waitFor(() => expect(screen.getByTestId('medical-record-form')).toBeInTheDocument())
    await userEvent.click(screen.getByTestId('medical-record-form-submit'))
    await waitFor(() => {
      expect(screen.getByTestId('medical-record-form-error')).toHaveTextContent(
        'Prontuário não pode ser editado após a conclusão da consulta.',
      )
    })
  })

  it('shows generic error when create fails with unexpected error', async () => {
    mockMedicalRecordsService.create.mockRejectedValue({ status: 500 })
    mockTemplatesService.getAll.mockResolvedValue({ data: [makeTemplateDto()], total: 1, page: 1, limit: 1 })
    renderWithProviders(<MedicalRecordSection {...defaultProps} />)
    await waitFor(() => expect(screen.getByTestId('fill-medical-record-button')).toBeInTheDocument())
    await userEvent.click(screen.getByTestId('fill-medical-record-button'))
    await waitFor(() => expect(screen.getByTestId('medical-record-form')).toBeInTheDocument())
    await userEvent.click(screen.getByTestId('medical-record-form-submit'))
    await waitFor(() => {
      expect(screen.getByTestId('medical-record-form-error')).toHaveTextContent(
        'Ocorreu um erro ao salvar o prontuário.',
      )
    })
  })

  it('submitting edit form calls update medical record service', async () => {
    mockMedicalRecordsService.getByAppointment.mockResolvedValue(makeRecordDto() as any)
    mockMedicalRecordsService.update.mockResolvedValue(makeRecordDto() as any)
    renderWithProviders(<MedicalRecordSection {...defaultProps} />)
    await waitFor(() => expect(screen.getByTestId('edit-medical-record-button')).toBeInTheDocument())
    await userEvent.click(screen.getByTestId('edit-medical-record-button'))
    await waitFor(() => expect(screen.getByTestId('medical-record-form')).toBeInTheDocument())
    await userEvent.click(screen.getByTestId('medical-record-form-submit'))
    await waitFor(() => {
      expect(mockMedicalRecordsService.update).toHaveBeenCalled()
    })
  })

  it('shows 422 error when update fails with 422', async () => {
    mockMedicalRecordsService.getByAppointment.mockResolvedValue(makeRecordDto() as any)
    mockMedicalRecordsService.update.mockRejectedValue({ status: 422 })
    renderWithProviders(<MedicalRecordSection {...defaultProps} />)
    await waitFor(() => expect(screen.getByTestId('edit-medical-record-button')).toBeInTheDocument())
    await userEvent.click(screen.getByTestId('edit-medical-record-button'))
    await waitFor(() => expect(screen.getByTestId('medical-record-form')).toBeInTheDocument())
    await userEvent.click(screen.getByTestId('medical-record-form-submit'))
    await waitFor(() => {
      expect(screen.getByTestId('medical-record-form-error')).toHaveTextContent(
        'Prontuário não pode ser editado após a conclusão da consulta.',
      )
    })
  })

  it('closing fill modal resets mode', async () => {
    mockTemplatesService.getAll.mockResolvedValue({ data: [makeTemplateDto()], total: 1, page: 1, limit: 1 })
    renderWithProviders(<MedicalRecordSection {...defaultProps} />)
    await waitFor(() => expect(screen.getByTestId('fill-medical-record-button')).toBeInTheDocument())
    await userEvent.click(screen.getByTestId('fill-medical-record-button'))
    await waitFor(() => expect(screen.getByTestId('medical-record-form-modal')).toBeInTheDocument())
    const fillModal = screen.getByTestId('medical-record-form-modal')
    await userEvent.click(within(fillModal).getByRole('button', { name: 'Fechar' }))
    await waitFor(() => {
      expect(screen.queryByTestId('medical-record-form-modal')).not.toBeInTheDocument()
    })
  })
})
