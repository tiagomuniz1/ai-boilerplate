import { visitClinic, expectClinicPath, CLINIC_SLUG } from '../../support/clinic'

const MOCK_PROFESSIONAL_ID = 'eeeeeeee-2222-2222-2222-000000000001'

const SPEC_ID_1 = '00000000-0000-4000-a000-000000000001'
const SPEC_ID_2 = '00000000-0000-4000-a000-000000000002'

const mockAuthUser = {
  id: 'mock-auth-user-id',
  fullName: 'Mock Admin',
  email: 'mock@admin.com',
  role: 'admin',
}

const mockProfessional = {
  id: MOCK_PROFESSIONAL_ID,
  user: { id: 'user-uuid-1', fullName: 'Dr. Detalhe Silva', email: 'detalhe@test.com' },
  registrations: [{ id: 'reg-1', councilType: 'crm', number: '54321', state: 'MG', isPrimary: true }],
  specialties: [
    { id: SPEC_ID_1, name: 'Cardiologia', registryNumber: null },
    { id: SPEC_ID_2, name: 'Neurologia', registryNumber: null },
  ],
  bio: 'Especialista em neurologia clínica.',
  createdAt: '2024-01-15T10:00:00.000Z',
  updatedAt: '2024-01-15T10:00:00.000Z',
}

describe('Professionals Detail', () => {
  beforeEach(() => {
    cy.clearCookies()
    cy.clearLocalStorage()
  })

  it('redirects to /login when not authenticated', () => {
    cy.visit(`/${CLINIC_SLUG}/professionals/${MOCK_PROFESSIONAL_ID}`)
    expectClinicPath('/login')
  })

  it('shows skeleton during data fetch', () => {
    cy.intercept('GET', `${Cypress.env('API_URL')}/professionals/${MOCK_PROFESSIONAL_ID}`, (req) => {
      req.reply({ delay: 1500, statusCode: 200, body: mockProfessional })
    }).as('getProfessional')

    visitClinic(`/professionals/${MOCK_PROFESSIONAL_ID}`, mockAuthUser)
    cy.get('[data-testid="professional-details-skeleton"]').should('be.visible')
    cy.wait('@getProfessional')
    cy.get('[data-testid="professional-details-skeleton"]').should('not.exist')
  })

  it('shows error state when professional does not exist', () => {
    cy.intercept('GET', `${Cypress.env('API_URL')}/professionals/${MOCK_PROFESSIONAL_ID}`, {
      statusCode: 404,
      body: { status: 404, title: 'Not Found', detail: 'Professional not found' },
    }).as('getProfessional')

    visitClinic(`/professionals/${MOCK_PROFESSIONAL_ID}`, mockAuthUser)
    cy.wait('@getProfessional')
    cy.get('[data-testid="professional-details-error"]').should('be.visible')
    cy.get('[data-testid="professional-details"]').should('not.exist')
  })

  it('shows professional details with name, email, registration, specialties and bio', () => {
    cy.intercept('GET', `${Cypress.env('API_URL')}/professionals/${MOCK_PROFESSIONAL_ID}`, {
      statusCode: 200,
      body: mockProfessional,
    }).as('getProfessional')

    visitClinic(`/professionals/${MOCK_PROFESSIONAL_ID}`, mockAuthUser)
    cy.wait('@getProfessional')

    cy.get('[data-testid="professional-details"]').should('be.visible')
    cy.get('[data-testid="professional-details-name"]').should('contain', mockProfessional.user.fullName)
    cy.get('[data-testid="professional-details-email"]').should('contain', mockProfessional.user.email)
    cy.get('[data-testid="professional-details-crm"]').should('contain', '54321/MG')
    cy.get('[data-testid="professional-details-specialties"]').should('be.visible')
    cy.get(`[data-testid="professional-details-specialty-badge-${SPEC_ID_1}"]`).should('contain', 'Cardiologia')
    cy.get(`[data-testid="professional-details-specialty-badge-${SPEC_ID_2}"]`).should('contain', 'Neurologia')
    cy.get('[data-testid="professional-details-bio"]').should('contain', mockProfessional.bio)
    cy.get('[data-testid="professional-details-created-at"]').should('be.visible')
  })

  it('shows all specialties as individual badges', () => {
    cy.intercept('GET', `${Cypress.env('API_URL')}/professionals/${MOCK_PROFESSIONAL_ID}`, {
      statusCode: 200,
      body: mockProfessional,
    }).as('getProfessional')

    visitClinic(`/professionals/${MOCK_PROFESSIONAL_ID}`, mockAuthUser)
    cy.wait('@getProfessional')

    cy.get('[data-testid="professional-details-specialties"]').within(() => {
      cy.get(`[data-testid="professional-details-specialty-badge-${SPEC_ID_1}"]`).should('exist')
      cy.get(`[data-testid="professional-details-specialty-badge-${SPEC_ID_2}"]`).should('exist')
    })
  })

  it('does not show bio section when bio is null', () => {
    cy.intercept('GET', `${Cypress.env('API_URL')}/professionals/${MOCK_PROFESSIONAL_ID}`, {
      statusCode: 200,
      body: { ...mockProfessional, bio: null },
    }).as('getProfessional')

    visitClinic(`/professionals/${MOCK_PROFESSIONAL_ID}`, mockAuthUser)
    cy.wait('@getProfessional')
    cy.get('[data-testid="professional-details-bio"]').should('not.exist')
  })

  it('back button navigates to /professionals', () => {
    cy.intercept('GET', `${Cypress.env('API_URL')}/professionals/${MOCK_PROFESSIONAL_ID}`, {
      statusCode: 200,
      body: mockProfessional,
    }).as('getProfessional')
    // Sem ficha de profissional: o default para quem só administra ou recepciona.
    // O glob `/professionals*` não cobre esta rota — `*` não atravessa a barra.
    cy.intercept('GET', `${Cypress.env('API_URL')}/professionals/me`, { statusCode: 200, body: null })
    cy.intercept('GET', `${Cypress.env('API_URL')}/professionals*`, {
      statusCode: 200,
      body: { data: [], total: 0, page: 1, limit: 20 },
    })

    visitClinic(`/professionals/${MOCK_PROFESSIONAL_ID}`, mockAuthUser)
    cy.wait('@getProfessional')
    cy.get('[data-testid="professional-details-back-button"]').click()
    expectClinicPath('/professionals')
  })

  it('edit button navigates to /professionals/[id]/edit', () => {
    cy.intercept('GET', `${Cypress.env('API_URL')}/professionals/${MOCK_PROFESSIONAL_ID}`, {
      statusCode: 200,
      body: mockProfessional,
    }).as('getProfessional')

    visitClinic(`/professionals/${MOCK_PROFESSIONAL_ID}`, mockAuthUser)
    cy.wait('@getProfessional')
    cy.get('[data-testid="professional-details-edit-button"]').click()
    expectClinicPath(`/professionals/${MOCK_PROFESSIONAL_ID}/edit`)
  })

  it('delete button opens dialog with professional name', () => {
    cy.intercept('GET', `${Cypress.env('API_URL')}/professionals/${MOCK_PROFESSIONAL_ID}`, {
      statusCode: 200,
      body: mockProfessional,
    }).as('getProfessional')

    visitClinic(`/professionals/${MOCK_PROFESSIONAL_ID}`, mockAuthUser)
    cy.wait('@getProfessional')
    cy.get('[data-testid="professional-details-delete-button"]').click()
    cy.get('[data-testid="delete-professional-dialog"]').should('be.visible')
    cy.get('[data-testid="delete-professional-dialog-message"]').should('contain', mockProfessional.user.fullName)
  })

  it('cancel button on dialog closes dialog without deleting', () => {
    cy.intercept('GET', `${Cypress.env('API_URL')}/professionals/${MOCK_PROFESSIONAL_ID}`, {
      statusCode: 200,
      body: mockProfessional,
    }).as('getProfessional')

    visitClinic(`/professionals/${MOCK_PROFESSIONAL_ID}`, mockAuthUser)
    cy.wait('@getProfessional')
    cy.get('[data-testid="professional-details-delete-button"]').click()
    cy.get('[data-testid="delete-professional-dialog"]').should('be.visible')
    cy.get('[data-testid="delete-professional-dialog-cancel"]').click()
    cy.get('[data-testid="delete-professional-dialog"]').should('not.exist')
    cy.get('[data-testid="professional-details"]').should('be.visible')
  })

  it('delete success navigates to /professionals', () => {
    cy.intercept('GET', `${Cypress.env('API_URL')}/professionals/${MOCK_PROFESSIONAL_ID}`, {
      statusCode: 200,
      body: mockProfessional,
    }).as('getProfessional')
    cy.intercept('DELETE', `${Cypress.env('API_URL')}/professionals/${MOCK_PROFESSIONAL_ID}`, {
      statusCode: 204,
      body: null,
    }).as('deleteProfessional')
    cy.intercept('GET', `${Cypress.env('API_URL')}/professionals*`, {
      statusCode: 200,
      body: { data: [], total: 0, page: 1, limit: 20 },
    })

    visitClinic(`/professionals/${MOCK_PROFESSIONAL_ID}`, mockAuthUser)
    cy.wait('@getProfessional')
    cy.get('[data-testid="professional-details-delete-button"]').click()
    cy.get('[data-testid="delete-professional-dialog-confirm"]').click()
    cy.wait('@deleteProfessional')
    expectClinicPath('/professionals')
  })
})

export {}
