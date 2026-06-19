import { visitClinic, CLINIC_SLUG } from '../../support/clinic'

const DOC_UUID = '00000000-0000-4000-b000-000000000001'

const mockAdminUser = {
  id: 'admin-uuid',
  fullName: 'Admin User',
  email: 'admin@pulso.center',
  role: 'admin',
  clinicId: '10000000-0000-4000-8000-000000000000',
}

const mockDoctorUser = {
  id: 'doctor-user-uuid',
  fullName: 'Dr. Test',
  email: 'doctor@pulso.center',
  role: 'doctor',
  clinicId: '10000000-0000-4000-8000-000000000000',
}

const mockDoctorsList = {
  data: [
    {
      id: DOC_UUID,
      user: { id: 'doctor-user-uuid', fullName: 'Dr. Test', email: 'doctor@pulso.center', isActive: true },
      crmNumber: '12345/SP',
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

const emptyAvailability = { doctorId: DOC_UUID, date: '2025-07-01', slots: [] }
const emptyAppointments = { data: [], total: 0, page: 1, limit: 100 }

describe('Appointments — agenda views', () => {
  beforeEach(() => {
    cy.clearCookies()
    cy.clearLocalStorage()
    cy.intercept('GET', `${Cypress.env('API_URL')}/doctors*`, { statusCode: 200, body: mockDoctorsList })
    cy.intercept('GET', `${Cypress.env('API_URL')}/appointments/availability*`, { statusCode: 200, body: emptyAvailability })
    cy.intercept('GET', `${Cypress.env('API_URL')}/appointments*`, { statusCode: 200, body: emptyAppointments })
    cy.intercept('GET', `${Cypress.env('API_URL')}/patients*`, { statusCode: 200, body: { data: [], total: 0, page: 1, limit: 200 } })
    cy.intercept('GET', `${Cypress.env('API_URL')}/schedule-exceptions*`, { statusCode: 200, body: { data: [], total: 0, page: 1, limit: 20 } })
  })

  it('ADMIN: sees doctor selector and empty state before selecting doctor', () => {
    visitClinic('/appointments', mockAdminUser)

    cy.get('[data-testid="appointments-page"]').should('be.visible')
    cy.get('[data-testid="agenda-toolbar"]').should('be.visible')
    cy.get('[data-testid="toolbar-doctor-selector"]').should('be.visible')
    cy.get('[data-testid="agenda-empty-doctor"]').should('be.visible')
  })

  it('DOCTOR: does not see doctor selector and loads own agenda', () => {
    visitClinic('/appointments', mockDoctorUser)

    cy.get('[data-testid="appointments-page"]').should('be.visible')
    cy.get('[data-testid="toolbar-doctor-selector"]').should('not.exist')
    cy.get('[data-testid="agenda-empty-doctor"]').should('not.exist')
  })

  it('ADMIN: selects doctor and loads availability', () => {
    visitClinic('/appointments', mockAdminUser)

    cy.get('[data-testid="toolbar-doctor-select"]').select(DOC_UUID)

    cy.get('[data-testid="agenda-week-grid"]', { timeout: 10000 }).should('exist')
  })

  it('switches from day view to week view', () => {
    visitClinic('/appointments', mockDoctorUser)

    cy.get('[data-testid="toolbar-view-week"]').click()
    cy.get('[data-testid="agenda-week-grid"]').should('be.visible')
  })

  it('navigates forward with next button in day view', () => {
    visitClinic('/appointments', mockDoctorUser)

    const initialLabel = cy.get('[data-testid="toolbar-date-label"]').invoke('text')
    cy.get('[data-testid="toolbar-next"]').click()
    cy.get('[data-testid="toolbar-date-label"]').invoke('text').should('not.equal', initialLabel)
  })

  it('navigates back to today with today button', () => {
    visitClinic('/appointments', mockDoctorUser)

    cy.get('[data-testid="toolbar-next"]').click()
    cy.get('[data-testid="toolbar-today"]').click()

    const today = new Date().toLocaleDateString('pt-BR', { day: 'numeric', month: 'long', year: 'numeric' })
    cy.get('[data-testid="toolbar-date-label"]').should('contain.text', String(new Date().getFullYear()))
  })
})
