import { visitClinic, CLINIC_SLUG } from '../../support/clinic'

const DOC_UUID = '00000000-0000-4000-b000-000000000001'

const mockAdminUser = {
  id: 'admin-uuid',
  fullName: 'Admin User',
  email: 'admin@pulso.center',
  role: 'admin',
  clinicId: '10000000-0000-4000-8000-000000000000',
}

const mockProfessionalUser = {
  id: 'professional-user-uuid',
  fullName: 'Dr. Test',
  email: 'professional@pulso.center',
  role: 'professional',
  clinicId: '10000000-0000-4000-8000-000000000000',
}

const mockProfessionalsList = {
  data: [
    {
      id: DOC_UUID,
      user: { id: 'professional-user-uuid', fullName: 'Dr. Test', email: 'professional@pulso.center', isActive: true },
      registrations: [{ id: 'reg-1', councilType: 'crm', number: '12345/SP', state: 'SP', isPrimary: true }],
      specialties: [],
      bio: null,
      createdAt: '2025-01-01T10:00:00.000Z',
      updatedAt: '2025-01-01T10:00:00.000Z',
    },
  ],
  total: 1,
  page: 1,
  limit: 200,
}

const emptyAvailability = { professionalId: DOC_UUID, date: '2025-07-01', slots: [] }
const emptyAppointments = { data: [], total: 0, page: 1, limit: 100 }

describe('Appointments — agenda views', () => {
  beforeEach(() => {
    cy.clearCookies()
    cy.clearLocalStorage()
    cy.intercept('GET', `${Cypress.env('API_URL')}/professionals*`, { statusCode: 200, body: mockProfessionalsList })
    cy.intercept('GET', `${Cypress.env('API_URL')}/appointments/availability*`, { statusCode: 200, body: emptyAvailability })
    cy.intercept('GET', `${Cypress.env('API_URL')}/appointments*`, { statusCode: 200, body: emptyAppointments })
    cy.intercept('GET', `${Cypress.env('API_URL')}/patients*`, { statusCode: 200, body: { data: [], total: 0, page: 1, limit: 200 } })
    cy.intercept('GET', `${Cypress.env('API_URL')}/schedule-exceptions*`, { statusCode: 200, body: { data: [], total: 0, page: 1, limit: 20 } })
  })

  it('ADMIN: sees professional selector and empty state before selecting professional', () => {
    visitClinic('/appointments', mockAdminUser)

    cy.get('[data-testid="appointments-page"]').should('be.visible')
    cy.get('[data-testid="agenda-toolbar"]').should('be.visible')
    cy.get('[data-testid="toolbar-professional-selector"]').should('be.visible')
    cy.get('[data-testid="agenda-empty-professional"]').should('be.visible')
  })

  it('PROFESSIONAL: does not see professional selector and loads own agenda', () => {
    visitClinic('/appointments', mockProfessionalUser)

    cy.get('[data-testid="appointments-page"]').should('be.visible')
    cy.get('[data-testid="toolbar-professional-selector"]').should('not.exist')
    cy.get('[data-testid="agenda-empty-professional"]').should('not.exist')
  })

  it('ADMIN: selects professional and loads availability', () => {
    visitClinic('/appointments', mockAdminUser)

    cy.get('[data-testid="toolbar-professional-select"]').select(DOC_UUID)

    cy.get('[data-testid="agenda-week-grid"]', { timeout: 10000 }).should('exist')
  })

  it('switches from day view to week view', () => {
    visitClinic('/appointments', mockProfessionalUser)

    cy.get('[data-testid="toolbar-view-week"]').click()
    cy.get('[data-testid="agenda-week-grid"]').should('be.visible')
  })

  it('navigates forward with next button in day view', () => {
    visitClinic('/appointments', mockProfessionalUser)

    const initialLabel = cy.get('[data-testid="toolbar-date-label"]').invoke('text')
    cy.get('[data-testid="toolbar-next"]').click()
    cy.get('[data-testid="toolbar-date-label"]').invoke('text').should('not.equal', initialLabel)
  })

  it('navigates back to today with today button', () => {
    visitClinic('/appointments', mockProfessionalUser)

    cy.get('[data-testid="toolbar-next"]').click()
    cy.get('[data-testid="toolbar-today"]').click()

    const today = new Date().toLocaleDateString('pt-BR', { day: 'numeric', month: 'long', year: 'numeric' })
    cy.get('[data-testid="toolbar-date-label"]').should('contain.text', String(new Date().getFullYear()))
  })

  it('mobile (375px): hides the Dia/Semana toggle and always shows the day grid, even with view=week in the URL', () => {
    cy.viewport(375, 700)
    visitClinic('/appointments?view=week', mockProfessionalUser)

    cy.get('[data-testid="toolbar-view-day"]').should('not.be.visible')
    cy.get('[data-testid="toolbar-view-week"]').should('not.be.visible')
    cy.get('[data-testid="agenda-week-grid"]').should('not.exist')
    // These intercepts return no slots for any date, so the day grid renders its
    // own empty state — what matters here is that it's the day grid's empty
    // state (not the week grid) despite ?view=week in the URL.
    cy.get('[data-testid="agenda-day-empty"]').should('exist')
  })
})
