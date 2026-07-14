jest.mock('next/navigation', () => ({ useRouter: jest.fn() }))
jest.mock('@/lib/slug-context', () => ({ useSlug: jest.fn(() => 'clinic-slug'), useBasePath: () => '/clinic-slug' }))
jest.mock('@/stores/auth.store')
jest.mock('../services/medical-record-templates.service')

import { screen, waitFor } from '@testing-library/react'
import { useRouter } from 'next/navigation'
import { UserRole, MedicalRecordFieldType } from '@app/shared'
import { useAuthStore } from '@/stores/auth.store'
import { medicalRecordTemplatesService } from '../services/medical-record-templates.service'
import { renderWithProviders } from '@/tests/utils/render-with-providers'
import { TemplateList } from './template-list'

;(useRouter as jest.Mock).mockReturnValue({ push: jest.fn() })

function mockAuthStoreAs(role: UserRole) {
  ;(useAuthStore as unknown as jest.Mock).mockImplementation(
    (selector: (s: { user: { id: string; fullName: string; email: string; role: UserRole } }) => unknown) =>
      selector({ user: { id: 'user-uuid', fullName: 'Test User', email: 'test@example.com', role } }),
  )
}

const makeDto = (overrides = {}) => ({
  id: 'uuid-1',
  specialtyId: 'spec-uuid',
  specialtyName: 'Cardiologia',
  name: 'Anamnese Cardíaca',
  fields: [{ key: 'k1', label: 'Sintoma', type: MedicalRecordFieldType.TEXT, required: true, order: 0, options: null, placeholder: null, helpText: null, canonical: false, canonicalKey: null }],
  isActive: true,
  createdAt: '2024-01-15T10:00:00.000Z',
  updatedAt: '2024-01-15T10:00:00.000Z',
  ...overrides,
})

const makePaginated = (items = [makeDto()]) => ({
  data: items,
  total: items.length,
  page: 1,
  limit: 20,
})

describe('TemplateList (integration)', () => {
  beforeEach(() => jest.clearAllMocks())

  describe('as ADMIN', () => {
    beforeEach(() => mockAuthStoreAs(UserRole.ADMIN))

    it('renders skeleton while loading', () => {
      ;(medicalRecordTemplatesService.getAll as jest.Mock).mockReturnValue(new Promise(() => {}))

      renderWithProviders(<TemplateList />)

      expect(screen.getByTestId('template-list-skeleton')).toBeInTheDocument()
    })

    it('renders table with templates on success', async () => {
      ;(medicalRecordTemplatesService.getAll as jest.Mock).mockResolvedValue(makePaginated())

      renderWithProviders(<TemplateList />)

      await waitFor(() => {
        expect(screen.getByTestId('template-list-table')).toBeInTheDocument()
      })

      expect(screen.getByTestId('template-name-uuid-1')).toHaveTextContent('Anamnese Cardíaca')
      expect(screen.getByTestId('template-specialty-uuid-1')).toHaveTextContent('Cardiologia')
      expect(screen.getByTestId('template-fields-count-uuid-1')).toHaveTextContent('1')
      expect(screen.getByTestId('template-status-uuid-1')).toHaveTextContent('Ativo')
    })

    it('renders a mobile card per template with name, specialty and status', async () => {
      ;(medicalRecordTemplatesService.getAll as jest.Mock).mockResolvedValue(makePaginated())

      renderWithProviders(<TemplateList />)

      await waitFor(() => expect(screen.getByTestId('template-card-uuid-1')).toBeInTheDocument())

      expect(screen.getByTestId('template-card-uuid-1-title')).toHaveTextContent('Anamnese Cardíaca')
      expect(screen.getByTestId('template-card-uuid-1')).toHaveTextContent('Cardiologia')
      expect(screen.getByTestId('template-card-view-link-uuid-1')).toHaveAttribute(
        'href',
        '/clinic-slug/medical-record-templates/uuid-1',
      )
    })

    it('labels a generalist template (null specialty) as "Generalista" in table and card', async () => {
      ;(medicalRecordTemplatesService.getAll as jest.Mock).mockResolvedValue(
        makePaginated([makeDto({ specialtyId: null, specialtyName: null })]),
      )

      renderWithProviders(<TemplateList />)

      await waitFor(() => expect(screen.getByTestId('template-list-table')).toBeInTheDocument())

      expect(screen.getByTestId('template-specialty-uuid-1')).toHaveTextContent('Generalista')
      expect(screen.getByTestId('template-card-uuid-1')).toHaveTextContent('Generalista')
    })

    it('renders Inativo status for inactive template', async () => {
      ;(medicalRecordTemplatesService.getAll as jest.Mock).mockResolvedValue(makePaginated([makeDto({ isActive: false })]))

      renderWithProviders(<TemplateList />)

      await waitFor(() => {
        expect(screen.getByTestId('template-list-table')).toBeInTheDocument()
      })

      expect(screen.getByTestId('template-status-uuid-1')).toHaveTextContent('Inativo')
    })

    it('renders empty state when no templates returned', async () => {
      ;(medicalRecordTemplatesService.getAll as jest.Mock).mockResolvedValue(makePaginated([]))

      renderWithProviders(<TemplateList />)

      await waitFor(() => {
        expect(screen.getByTestId('template-list-empty')).toBeInTheDocument()
      })

      expect(screen.queryByTestId('template-list-table')).not.toBeInTheDocument()
    })

    it('renders error state on fetch failure', async () => {
      ;(medicalRecordTemplatesService.getAll as jest.Mock).mockRejectedValue(new Error('Network error'))

      renderWithProviders(<TemplateList />)

      await waitFor(() => {
        expect(screen.getByTestId('template-list-error')).toBeInTheDocument()
      })
    })

    it('shows new template button for ADMIN', async () => {
      ;(medicalRecordTemplatesService.getAll as jest.Mock).mockResolvedValue(makePaginated([]))

      renderWithProviders(<TemplateList />)

      await waitFor(() => expect(screen.getByTestId('template-list-empty')).toBeInTheDocument())

      expect(screen.getByTestId('template-list-new-button')).toBeInTheDocument()
    })

    it('view details link navigates to template page', async () => {
      ;(medicalRecordTemplatesService.getAll as jest.Mock).mockResolvedValue(makePaginated())

      renderWithProviders(<TemplateList />)

      await waitFor(() => expect(screen.getByTestId('template-list-table')).toBeInTheDocument())

      expect(screen.getByTestId('template-view-link-uuid-1')).toHaveAttribute(
        'href',
        '/clinic-slug/medical-record-templates/uuid-1',
      )
    })
  })

  describe('as DOCTOR', () => {
    beforeEach(() => mockAuthStoreAs(UserRole.DOCTOR))

    it('does not show new template button', async () => {
      ;(medicalRecordTemplatesService.getAll as jest.Mock).mockResolvedValue(makePaginated([]))

      renderWithProviders(<TemplateList />)

      await waitFor(() => expect(screen.getByTestId('template-list-empty')).toBeInTheDocument())

      expect(screen.queryByTestId('template-list-new-button')).not.toBeInTheDocument()
    })
  })
})
