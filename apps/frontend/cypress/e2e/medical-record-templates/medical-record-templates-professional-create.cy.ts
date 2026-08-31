import { visitClinic, CLINIC_ID } from '../../support/clinic'

// Cobre a permissão de qualquer profissional criar o próprio modelo de prontuário:
// médico (CRM) restrito às próprias especialidades, e demais profissões (ex: CRN)
// direto para a profissão, sem especialidade. Cobre também o bloqueio de USER.

const SPEC_ID_CARDIO = '00000000-0000-4000-a000-000000000001'
const SPEC_ID_DERMATO = '00000000-0000-4000-a000-000000000002'

const mockUser = {
  id: 'mock-professional-user-id',
  fullName: 'Dra. Ana',
  email: 'ana@clinic.com',
  role: 'professional',
  clinicId: CLINIC_ID,
}

const mockCrmProfessional = {
  id: 'professional-uuid-crm',
  user: { id: mockUser.id, fullName: mockUser.fullName, email: mockUser.email },
  registrations: [{ id: 'reg-1', councilType: 'crm', number: '123456', state: 'SP', isPrimary: true }],
  specialties: [{ id: SPEC_ID_CARDIO, name: 'Cardiologia', registryNumber: null }],
  bio: null,
  createdAt: '2024-01-15T10:00:00.000Z',
  updatedAt: '2024-01-15T10:00:00.000Z',
}

const mockCrnProfessional = {
  id: 'professional-uuid-crn',
  user: { id: mockUser.id, fullName: mockUser.fullName, email: mockUser.email },
  registrations: [{ id: 'reg-1', councilType: 'crn', number: '654321', state: 'SP', isPrimary: true }],
  specialties: [],
  bio: null,
  createdAt: '2024-01-15T10:00:00.000Z',
  updatedAt: '2024-01-15T10:00:00.000Z',
}

// template-form.tsx sempre dispara useSpecialties() (catálogo completo da clínica), mesmo
// quando o profissional acaba usando só as próprias especialidades — sem interceptar, a
// chamada bate no backend real com o token mock e derruba o teste num loop de redirect.
const mockClinicSpecialties = {
  data: [
    { id: SPEC_ID_CARDIO, name: 'Cardiologia', description: null, createdAt: '2024-01-01T00:00:00.000Z', updatedAt: '2024-01-01T00:00:00.000Z' },
    { id: SPEC_ID_DERMATO, name: 'Dermatologia', description: null, createdAt: '2024-01-01T00:00:00.000Z', updatedAt: '2024-01-01T00:00:00.000Z' },
  ],
  total: 2,
  page: 1,
  limit: 100,
}

describe('Medical Record Templates — professional creation', () => {
  beforeEach(() => {
    cy.clearCookies()
    cy.clearLocalStorage()
    cy.intercept('GET', `${Cypress.env('API_URL')}/medical-record-canonical-fields*`, {
      statusCode: 200,
      body: [],
    }).as('getCanonicalFields')
    // O formulário lê as especialidades VINCULADAS À CLÍNICA, não o catálogo
    // da plataforma.
    cy.intercept('GET', `${Cypress.env('API_URL')}/clinics/*/specialties*`, {
      statusCode: 200,
      body: {
        ...mockClinicSpecialties,
        data: mockClinicSpecialties.data.map((s) => ({
          id: `link-${s.id}`,
          clinicId: CLINIC_ID,
          specialtyId: s.id,
          name: s.name,
          description: s.description ?? null,
          linkedAt: '2024-01-01T00:00:00.000Z',
        })),
      },
    }).as('getSpecialties')
  })

  describe('CRM professional', () => {
    beforeEach(() => {
      cy.intercept('GET', `${Cypress.env('API_URL')}/professionals*`, {
        statusCode: 200,
        body: { data: [mockCrmProfessional], total: 1, page: 1, limit: 20 },
      }).as('getMyProfessional')
    })

    it('restricts the specialty selector to the professional own specialties', () => {
      visitClinic('/medical-record-templates/new', mockUser)
      cy.wait('@getMyProfessional')

      cy.get('[data-testid="template-form-specialty"]').should('be.visible')
      cy.get('[data-testid="template-form-specialty"] option').should('have.length', 2) // "Generalista" + own specialty
      cy.get('[data-testid="template-form-specialty"]').contains('option', 'Cardiologia').should('exist')
      cy.get('[data-testid="template-form-specialty"]').contains('option', 'Dermatologia').should('not.exist')

      cy.get('[data-testid="template-form-council-type"]').should('not.exist')
    })

    // Real-backend happy path lives in medical-record-templates-happy-path-real.cy.ts.
  })

  describe('non-CRM professional (CRN)', () => {
    beforeEach(() => {
      cy.intercept('GET', `${Cypress.env('API_URL')}/professionals*`, {
        statusCode: 200,
        body: { data: [mockCrnProfessional], total: 1, page: 1, limit: 20 },
      }).as('getMyProfessional')
    })

    it('hides the specialty selector entirely', () => {
      visitClinic('/medical-record-templates/new', mockUser)
      cy.wait('@getMyProfessional')

      cy.get('[data-testid="template-form-specialty"]').should('not.exist')
      cy.get('[data-testid="template-form-council-type"]').should('not.exist')
    })

    // Real-backend happy path (+ the real 409 for a 2nd generalist template of the
    // same council type) lives in medical-record-templates-happy-path-real.cy.ts.
  })

  describe('USER role', () => {
    const mockUserRoleAccount = {
      id: 'mock-user-role-id',
      fullName: 'Recepcionista',
      email: 'recepcao@clinic.com',
      role: 'user',
      clinicId: CLINIC_ID,
    }

    it('is blocked from the template list page', () => {
      visitClinic('/medical-record-templates', mockUserRoleAccount)
      cy.get('[data-testid="medical-record-templates-page-forbidden"]').should('be.visible')
      cy.get('[data-testid="template-list"]').should('not.exist')
    })

    it('is blocked from the new template page', () => {
      visitClinic('/medical-record-templates/new', mockUserRoleAccount)
      cy.get('[data-testid="new-medical-record-template-page-forbidden"]').should('be.visible')
      cy.get('[data-testid="template-form"]').should('not.exist')
    })
  })
})

export {}
