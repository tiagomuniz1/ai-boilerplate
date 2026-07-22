jest.mock('next/navigation', () => ({ useRouter: jest.fn() }))
jest.mock('@/lib/slug-context', () => ({ useSlug: jest.fn(() => 'clinic-slug'), useBasePath: () => '/clinic-slug' }))
jest.mock('@/stores/auth.store')
jest.mock('../services/medical-record-templates.service')
jest.mock('../../professionals/services/professionals.service')

import { screen, waitFor } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { useRouter } from 'next/navigation'
import { CouncilType, UserRole, MedicalRecordFieldType } from '@app/shared'
import { useAuthStore } from '@/stores/auth.store'
import { medicalRecordTemplatesService } from '../services/medical-record-templates.service'
import { professionalsService } from '../../professionals/services/professionals.service'
import { renderWithProviders } from '@/tests/utils/render-with-providers'
import { TemplateDetails } from './template-details'

;(useRouter as jest.Mock).mockReturnValue({ push: jest.fn() })

function mockAuthStoreAs(role: UserRole) {
  ;(useAuthStore as unknown as jest.Mock).mockImplementation(
    (selector: (s: { user: { id: string; fullName: string; email: string; role: UserRole } }) => unknown) =>
      selector({ user: { id: 'user-uuid', fullName: 'Test User', email: 'test@example.com', role } }),
  )
}

function mockMyProfessional(overrides = {}) {
  ;(professionalsService.getAll as jest.Mock).mockResolvedValue({
    data: [
      {
        id: 'my-professional-uuid',
        user: { id: 'user-uuid', fullName: 'Dr. João', email: 'joao@example.com', isActive: true },
        registrations: [{ id: 'reg-1', councilType: CouncilType.CRM, number: '12345', state: 'SP', isPrimary: true }],
        specialties: [],
        bio: null,
        createdAt: new Date().toISOString(),
        updatedAt: new Date().toISOString(),
        ...overrides,
      },
    ],
    total: 1,
    page: 1,
    limit: 20,
  })
}

const makeDto = (overrides = {}) => ({
  id: 'uuid-1',
  specialtyId: 'spec-uuid',
  specialtyName: 'Cardiologia',
  name: 'Anamnese Cardíaca',
  fields: [
    {
      key: 'k1',
      label: 'Sintoma principal',
      type: MedicalRecordFieldType.TEXT,
      required: true,
      order: 0,
      options: null,
      placeholder: null,
      helpText: null,
      canonical: false,
      canonicalKey: null,
    },
  ],
  isActive: true,
  createdAt: '2024-01-15T10:00:00.000Z',
  updatedAt: '2024-01-15T10:00:00.000Z',
  ...overrides,
})

describe('TemplateDetails (integration)', () => {
  beforeEach(() => jest.clearAllMocks())

  describe('as ADMIN', () => {
    beforeEach(() => mockAuthStoreAs(UserRole.ADMIN))

    it('renders skeleton while loading', () => {
      ;(medicalRecordTemplatesService.getById as jest.Mock).mockReturnValue(new Promise(() => {}))

      renderWithProviders(<TemplateDetails templateId="uuid-1" />)

      expect(screen.getByTestId('template-list-skeleton')).toBeInTheDocument()
    })

    it('renders template details on success', async () => {
      ;(medicalRecordTemplatesService.getById as jest.Mock).mockResolvedValue(makeDto())

      renderWithProviders(<TemplateDetails templateId="uuid-1" />)

      await waitFor(() => {
        expect(screen.getByTestId('template-details')).toBeInTheDocument()
      })

      expect(screen.getByTestId('template-details-name')).toHaveTextContent('Anamnese Cardíaca')
      expect(screen.getByTestId('template-details-profession')).toHaveTextContent('Medicina')
      expect(screen.getByTestId('template-details-specialty')).toHaveTextContent('Cardiologia')
      expect(screen.getByTestId('template-details-status')).toHaveTextContent('Ativo')
    })

    it('renders field list with required badge', async () => {
      ;(medicalRecordTemplatesService.getById as jest.Mock).mockResolvedValue(makeDto())

      renderWithProviders(<TemplateDetails templateId="uuid-1" />)

      await waitFor(() => expect(screen.getByTestId('template-details')).toBeInTheDocument())

      expect(screen.getByTestId('template-details-field-0')).toBeInTheDocument()
      expect(screen.getByText('Sintoma principal')).toBeInTheDocument()
    })

    it('shows the profession for a generalist (null specialty) template and leaves specialty blank', async () => {
      ;(medicalRecordTemplatesService.getById as jest.Mock).mockResolvedValue(
        makeDto({ specialtyId: null, specialtyName: null, councilType: 'crm' }),
      )

      renderWithProviders(<TemplateDetails templateId="uuid-1" />)

      await waitFor(() => expect(screen.getByTestId('template-details')).toBeInTheDocument())

      expect(screen.getByTestId('template-details-profession')).toHaveTextContent('Medicina')
      expect(screen.getByTestId('template-details-specialty')).toHaveTextContent('—')
    })

    it('renders error state when fetch fails', async () => {
      ;(medicalRecordTemplatesService.getById as jest.Mock).mockRejectedValue(new Error('Not found'))

      renderWithProviders(<TemplateDetails templateId="uuid-1" />)

      await waitFor(() => {
        expect(screen.getByTestId('template-details-error')).toBeInTheDocument()
      })
    })

    it('shows edit and delete buttons for ADMIN', async () => {
      ;(medicalRecordTemplatesService.getById as jest.Mock).mockResolvedValue(makeDto())

      renderWithProviders(<TemplateDetails templateId="uuid-1" />)

      await waitFor(() => expect(screen.getByTestId('template-details')).toBeInTheDocument())

      expect(screen.getByTestId('template-details-edit-button')).toBeInTheDocument()
      expect(screen.getByTestId('template-details-delete-button')).toBeInTheDocument()
    })

    it('opens delete dialog when delete button clicked', async () => {
      ;(medicalRecordTemplatesService.getById as jest.Mock).mockResolvedValue(makeDto())

      renderWithProviders(<TemplateDetails templateId="uuid-1" />)

      await waitFor(() => expect(screen.getByTestId('template-details')).toBeInTheDocument())

      await userEvent.click(screen.getByTestId('template-details-delete-button'))

      expect(screen.getByTestId('template-delete-dialog')).toBeInTheDocument()
    })

    it('closes delete dialog on cancel', async () => {
      ;(medicalRecordTemplatesService.getById as jest.Mock).mockResolvedValue(makeDto())

      renderWithProviders(<TemplateDetails templateId="uuid-1" />)

      await waitFor(() => expect(screen.getByTestId('template-details')).toBeInTheDocument())

      await userEvent.click(screen.getByTestId('template-details-delete-button'))
      await userEvent.click(screen.getByTestId('template-delete-dialog-cancel'))

      await waitFor(() => {
        expect(screen.queryByTestId('template-delete-dialog')).not.toBeInTheDocument()
      })
    })

    it('calls delete service when confirm delete is clicked', async () => {
      ;(medicalRecordTemplatesService.getById as jest.Mock).mockResolvedValue(makeDto())
      ;(medicalRecordTemplatesService.remove as jest.Mock).mockResolvedValue(undefined)
      ;(medicalRecordTemplatesService.getAll as jest.Mock).mockResolvedValue({
        data: [],
        total: 0,
        page: 1,
        limit: 20,
      })

      renderWithProviders(<TemplateDetails templateId="uuid-1" />)

      await waitFor(() => expect(screen.getByTestId('template-details')).toBeInTheDocument())

      await userEvent.click(screen.getByTestId('template-details-delete-button'))
      await userEvent.click(screen.getByTestId('template-delete-dialog-confirm'))

      await waitFor(() => {
        expect(medicalRecordTemplatesService.remove).toHaveBeenCalledWith('uuid-1')
      })
    })

    it('shows delete error when delete fails', async () => {
      ;(medicalRecordTemplatesService.getById as jest.Mock).mockResolvedValue(makeDto())
      ;(medicalRecordTemplatesService.remove as jest.Mock).mockRejectedValue({ status: 500 })

      renderWithProviders(<TemplateDetails templateId="uuid-1" />)

      await waitFor(() => expect(screen.getByTestId('template-details')).toBeInTheDocument())

      await userEvent.click(screen.getByTestId('template-details-delete-button'))
      await userEvent.click(screen.getByTestId('template-delete-dialog-confirm'))

      await waitFor(() => {
        expect(screen.getByTestId('template-details-delete-error')).toBeInTheDocument()
      })
      expect(screen.getByTestId('template-details-delete-error')).toHaveTextContent(
        'Não foi possível excluir o modelo',
      )
    })

    it('shows "Inativo" status for inactive template', async () => {
      ;(medicalRecordTemplatesService.getById as jest.Mock).mockResolvedValue(makeDto({ isActive: false }))

      renderWithProviders(<TemplateDetails templateId="uuid-1" />)

      await waitFor(() => expect(screen.getByTestId('template-details')).toBeInTheDocument())

      expect(screen.getByTestId('template-details-status')).toHaveTextContent('Inativo')
    })

    it('shows canonical badge when field is canonical', async () => {
      ;(medicalRecordTemplatesService.getById as jest.Mock).mockResolvedValue(
        makeDto({
          fields: [
            {
              key: 'k1',
              label: 'Sintoma principal',
              type: MedicalRecordFieldType.TEXT,
              required: false,
              order: 0,
              options: null,
              placeholder: null,
              helpText: null,
              canonical: true,
              canonicalKey: 'chief_complaint',
            },
          ],
        }),
      )

      renderWithProviders(<TemplateDetails templateId="uuid-1" />)

      await waitFor(() => expect(screen.getByTestId('template-details')).toBeInTheDocument())

      expect(screen.getByText('Canônico')).toBeInTheDocument()
      expect(screen.getByText(/chief_complaint/)).toBeInTheDocument()
    })

    it('shows options chips for SELECT field', async () => {
      ;(medicalRecordTemplatesService.getById as jest.Mock).mockResolvedValue(
        makeDto({
          fields: [
            {
              key: 'k1',
              label: 'Gravidade',
              type: MedicalRecordFieldType.SELECT,
              required: false,
              order: 0,
              options: [
                { value: 'low', label: 'Baixo' },
                { value: 'high', label: 'Alto' },
              ],
              placeholder: null,
              helpText: null,
              canonical: false,
              canonicalKey: null,
            },
          ],
        }),
      )

      renderWithProviders(<TemplateDetails templateId="uuid-1" />)

      await waitFor(() => expect(screen.getByTestId('template-details')).toBeInTheDocument())

      expect(screen.getByText('Baixo')).toBeInTheDocument()
      expect(screen.getByText('Alto')).toBeInTheDocument()
    })

    it('renders flat field without key using index as fallback', async () => {
      ;(medicalRecordTemplatesService.getById as jest.Mock).mockResolvedValue(
        makeDto({
          fields: [
            {
              label: 'Sintoma principal',
              type: MedicalRecordFieldType.TEXT,
              required: true,
              order: 0,
              options: null,
              placeholder: null,
              helpText: null,
              canonical: false,
              canonicalKey: null,
            },
          ],
        }),
      )

      renderWithProviders(<TemplateDetails templateId="uuid-1" />)
      await waitFor(() => expect(screen.getByTestId('template-details')).toBeInTheDocument())
      expect(screen.getByTestId('template-details-field-0')).toBeInTheDocument()
    })

    it('renders section field without key using index as fallback', async () => {
      ;(medicalRecordTemplatesService.getById as jest.Mock).mockResolvedValue(
        makeDto({
          sections: [{ key: 's_abc1', title: 'Anamnese', order: 0 }],
          fields: [
            {
              label: 'Queixa principal',
              type: MedicalRecordFieldType.TEXT,
              required: false,
              order: 0,
              options: null,
              placeholder: null,
              helpText: null,
              canonical: false,
              canonicalKey: null,
              sectionKey: 's_abc1',
            },
          ],
        }),
      )

      renderWithProviders(<TemplateDetails templateId="uuid-1" />)
      await waitFor(() => expect(screen.getByTestId('template-details')).toBeInTheDocument())
      expect(screen.getByTestId('template-details-section-0')).toBeInTheDocument()
      expect(screen.getByTestId('template-details-field-0')).toBeInTheDocument()
    })

    it('renders section block with title and fields', async () => {
      ;(medicalRecordTemplatesService.getById as jest.Mock).mockResolvedValue(
        makeDto({
          sections: [{ key: 's_abc1', title: 'Anamnese', order: 0 }],
          fields: [
            {
              key: 'k1',
              label: 'Sintoma principal',
              type: MedicalRecordFieldType.TEXT,
              required: true,
              order: 0,
              options: null,
              placeholder: null,
              helpText: null,
              canonical: false,
              canonicalKey: null,
              sectionKey: 's_abc1',
            },
          ],
        }),
      )

      renderWithProviders(<TemplateDetails templateId="uuid-1" />)
      await waitFor(() => expect(screen.getByTestId('template-details')).toBeInTheDocument())

      expect(screen.getByTestId('template-details-section-0')).toBeInTheDocument()
      expect(screen.getByTestId('template-details-section-title-0')).toHaveTextContent('Anamnese')
      expect(screen.getByTestId('template-details-field-0')).toBeInTheDocument()
      expect(screen.getByText('Sintoma principal')).toBeInTheDocument()
    })

    it('renders empty message when section has no fields', async () => {
      ;(medicalRecordTemplatesService.getById as jest.Mock).mockResolvedValue(
        makeDto({
          sections: [{ key: 's_empty', title: 'Seção Vazia', order: 0 }],
          fields: [],
        }),
      )

      renderWithProviders(<TemplateDetails templateId="uuid-1" />)
      await waitFor(() => expect(screen.getByTestId('template-details')).toBeInTheDocument())

      expect(screen.getByTestId('template-details-section-0')).toBeInTheDocument()
      expect(screen.getByTestId('template-details-section-empty-0')).toBeInTheDocument()
    })
  })

  describe('as PROFESSIONAL', () => {
    beforeEach(() => mockAuthStoreAs(UserRole.PROFESSIONAL))

    it('never shows the delete button, even when owning the template scope', async () => {
      mockMyProfessional({ specialties: [{ id: 'spec-uuid', name: 'Cardiologia' }] })
      ;(medicalRecordTemplatesService.getById as jest.Mock).mockResolvedValue(makeDto())

      renderWithProviders(<TemplateDetails templateId="uuid-1" />)

      await waitFor(() => expect(screen.getByTestId('template-details')).toBeInTheDocument())

      expect(screen.queryByTestId('template-details-delete-button')).not.toBeInTheDocument()
    })

    it('shows the edit button when the professional owns the template specialty', async () => {
      mockMyProfessional({ specialties: [{ id: 'spec-uuid', name: 'Cardiologia' }] })
      ;(medicalRecordTemplatesService.getById as jest.Mock).mockResolvedValue(makeDto())

      renderWithProviders(<TemplateDetails templateId="uuid-1" />)

      await waitFor(() => expect(screen.getByTestId('template-details-edit-button')).toBeInTheDocument())
    })

    it('does not show the edit button when the professional does not own the template specialty', async () => {
      mockMyProfessional({ specialties: [{ id: 'other-spec-uuid', name: 'Dermatologia' }] })
      ;(medicalRecordTemplatesService.getById as jest.Mock).mockResolvedValue(makeDto())

      renderWithProviders(<TemplateDetails templateId="uuid-1" />)

      await waitFor(() => expect(screen.getByTestId('template-details')).toBeInTheDocument())

      expect(screen.queryByTestId('template-details-edit-button')).not.toBeInTheDocument()
    })

    it('shows the edit button for a generalist template matching the professional own council type', async () => {
      mockMyProfessional({
        registrations: [{ id: 'reg-1', councilType: CouncilType.CRN, number: '999', state: 'SP', isPrimary: true }],
        specialties: [],
      })
      ;(medicalRecordTemplatesService.getById as jest.Mock).mockResolvedValue(
        makeDto({ specialtyId: null, specialtyName: null, councilType: CouncilType.CRN }),
      )

      renderWithProviders(<TemplateDetails templateId="uuid-1" />)

      await waitFor(() => expect(screen.getByTestId('template-details-edit-button')).toBeInTheDocument())
    })

    it('does not show the edit button for a generalist template of a different council type', async () => {
      mockMyProfessional({
        registrations: [{ id: 'reg-1', councilType: CouncilType.CRN, number: '999', state: 'SP', isPrimary: true }],
        specialties: [],
      })
      ;(medicalRecordTemplatesService.getById as jest.Mock).mockResolvedValue(
        makeDto({ specialtyId: null, specialtyName: null, councilType: CouncilType.CREFITO }),
      )

      renderWithProviders(<TemplateDetails templateId="uuid-1" />)

      await waitFor(() => expect(screen.getByTestId('template-details')).toBeInTheDocument())

      expect(screen.queryByTestId('template-details-edit-button')).not.toBeInTheDocument()
    })

    it('does not show the edit button while the own professional data has not resolved', async () => {
      ;(professionalsService.getAll as jest.Mock).mockReturnValue(new Promise(() => {}))
      ;(medicalRecordTemplatesService.getById as jest.Mock).mockResolvedValue(makeDto())

      renderWithProviders(<TemplateDetails templateId="uuid-1" />)

      await waitFor(() => expect(screen.getByTestId('template-details')).toBeInTheDocument())

      expect(screen.queryByTestId('template-details-edit-button')).not.toBeInTheDocument()
    })
  })

  describe('profession and specialty fields', () => {
    beforeEach(() => mockAuthStoreAs(UserRole.ADMIN))

    it('shows the profession for a non-CRM (specialty-less) template and leaves specialty blank', async () => {
      ;(medicalRecordTemplatesService.getById as jest.Mock).mockResolvedValue(
        makeDto({ specialtyId: null, specialtyName: null, councilType: CouncilType.CRN }),
      )

      renderWithProviders(<TemplateDetails templateId="uuid-1" />)

      await waitFor(() => {
        expect(screen.getByTestId('template-details-profession')).toHaveTextContent('Nutrição')
      })
      expect(screen.getByTestId('template-details-specialty')).toHaveTextContent('—')
    })
  })
})
