import { visitClinic, expectClinicPath, CLINIC_SLUG, CLINIC_ID } from '../../support/clinic'


const SPEC_ID_1 = '00000000-0000-4000-a000-000000000001'

const mockProfessionalUser = {
  id: 'professional-user-uuid',
  fullName: 'Dr. João Silva',
  email: 'joao@test.com',
  role: 'professional',
}

const mockAdminUser = {
  id: 'admin-user-uuid',
  fullName: 'Admin User',
  email: 'admin@test.com',
  role: 'admin',
}

const mockSchedule = {
  id: 'schedule-uuid-1',
  professionalId: 'doc-uuid-1',
  professionalName: 'Dr. João Silva',
  dayOfWeek: 'MONDAY',
  startTime: '08:00',
  endTime: '12:00',
  slotDurationInMinutes: 30,
  validFrom: null,
  validUntil: null,
  createdAt: '2025-01-01T10:00:00.000Z',
  updatedAt: '2025-01-01T10:00:00.000Z',
}

const emptyListResponse = { data: [], total: 0, page: 1, limit: 20 }
const populatedListResponse = { data: [mockSchedule], total: 1, page: 1, limit: 20 }

const mockProfessionalsList = {
  data: [
    {
      id: 'doc-uuid-1',
      user: { id: 'user-uuid-1', fullName: 'Dr. João Silva', email: 'joao@test.com' },
      registrations: [{ id: 'reg-1', councilType: 'crm', number: '12345/SP', state: 'SP', isPrimary: true }],
      specialties: [{ id: SPEC_ID_1, name: 'Cardiologia' }],
      bio: null,
      createdAt: '2025-01-01T10:00:00.000Z',
      updatedAt: '2025-01-01T10:00:00.000Z',
    },
  ],
  total: 1,
  page: 1,
  limit: 100,
}

describe('Schedules List', () => {
  beforeEach(() => {
    cy.clearCookies()
    cy.clearLocalStorage()
    // A ficha do próprio usuário: neste spec ele é o profissional.
    // O glob `/professionals*` não cobre esta rota — `*` não atravessa a barra.
    cy.intercept('GET', `${Cypress.env('API_URL')}/professionals/me`, { statusCode: 200, body: mockProfessionalsList.data[0] })
    cy.intercept('GET', `${Cypress.env('API_URL')}/professionals*`, { statusCode: 200, body: mockProfessionalsList })
  })

  it('redirects to /login when not authenticated', () => {
    cy.visit(`/${CLINIC_SLUG}/schedules`)
    expectClinicPath('/login')
  })

  it('shows a skeleton while loading', () => {
    cy.intercept('GET', `${Cypress.env('API_URL')}/schedules*`, {
      statusCode: 200,
      body: emptyListResponse,
      delay: 500,
    }).as('getSchedulesSlow')
    visitClinic('/schedules', mockProfessionalUser)
    cy.get('[data-testid="schedule-list-skeleton"]').should('be.visible')
    cy.wait('@getSchedulesSlow')
    cy.get('[data-testid="schedule-list-skeleton"]').should('not.exist')
  })

  it('shows empty state when no schedules exist', () => {
    cy.intercept('GET', `${Cypress.env('API_URL')}/schedules*`, { statusCode: 200, body: emptyListResponse }).as('getSchedules')
    visitClinic('/schedules', mockProfessionalUser)
    cy.wait('@getSchedules')
    cy.get('[data-testid="schedule-list-empty"]').should('be.visible')
    cy.get('[data-testid="schedule-list-table"]').should('not.exist')
  })

  it('shows total count of schedules found', () => {
    cy.intercept('GET', `${Cypress.env('API_URL')}/schedules*`, { statusCode: 200, body: populatedListResponse }).as('getSchedules')
    visitClinic('/schedules', mockProfessionalUser)
    cy.wait('@getSchedules')
    cy.contains('1 agenda encontrada').should('be.visible')
  })

  it('shows table with schedule rows', () => {
    cy.intercept('GET', `${Cypress.env('API_URL')}/schedules*`, { statusCode: 200, body: populatedListResponse }).as('getSchedules')
    visitClinic('/schedules', mockProfessionalUser)
    cy.wait('@getSchedules')
    cy.get('[data-testid="schedule-list-table"]').should('be.visible')
    cy.get(`[data-testid="schedule-table-row-${mockSchedule.id}"]`).should('exist')
    cy.get(`[data-testid="schedule-day-${mockSchedule.id}"]`).should('contain', 'Segunda-feira')
    cy.get(`[data-testid="schedule-time-${mockSchedule.id}"]`).should('contain', '08:00')
    cy.get(`[data-testid="schedule-slot-${mockSchedule.id}"]`).should('contain', '30 min')
  })

  it('hides professional filter and professional column for PROFESSIONAL role', () => {
    cy.intercept('GET', `${Cypress.env('API_URL')}/schedules*`, { statusCode: 200, body: populatedListResponse }).as('getSchedules')
    visitClinic('/schedules', mockProfessionalUser)
    cy.wait('@getSchedules')
    cy.get('[data-testid="schedule-filter-professional"]').should('not.exist')
    cy.get(`[data-testid="schedule-professional-${mockSchedule.id}"]`).should('not.exist')
  })

  it('shows professional filter and professional column for ADMIN role', () => {
    cy.intercept('GET', `${Cypress.env('API_URL')}/schedules*`, { statusCode: 200, body: populatedListResponse }).as('getSchedules')
    visitClinic('/schedules', mockAdminUser)
    cy.wait('@getSchedules')
    cy.get('[data-testid="schedule-filter-professional"]').should('be.visible')
    cy.get(`[data-testid="schedule-professional-${mockSchedule.id}"]`).should('contain', 'Dr. João Silva')
  })

  it('shows error alert when API fails', () => {
    cy.intercept('GET', `${Cypress.env('API_URL')}/schedules*`, { statusCode: 500, body: { title: 'Internal Server Error' } }).as('getSchedules')
    visitClinic('/schedules', mockProfessionalUser)
    cy.wait('@getSchedules')
    cy.get('[data-testid="schedule-list-error"]').should('be.visible')
    cy.get('[data-testid="schedule-list-table"]').should('not.exist')
  })

  it('shows "Nova agenda" button', () => {
    cy.intercept('GET', `${Cypress.env('API_URL')}/schedules*`, { statusCode: 200, body: emptyListResponse }).as('getSchedules')
    visitClinic('/schedules', mockProfessionalUser)
    cy.wait('@getSchedules')
    cy.get('[data-testid="schedule-list-new-button"]').should('be.visible')
  })

  it('"Nova agenda" button navigates to /schedules/new', () => {
    cy.intercept('GET', `${Cypress.env('API_URL')}/schedules*`, { statusCode: 200, body: emptyListResponse }).as('getSchedules')
    visitClinic('/schedules', mockProfessionalUser)
    cy.wait('@getSchedules')
    cy.get('[data-testid="schedule-list-new-button"]').click()
    expectClinicPath('/schedules/new')
  })

  it('view link navigates to schedule detail page', () => {
    cy.intercept('GET', `${Cypress.env('API_URL')}/schedules*`, { statusCode: 200, body: populatedListResponse }).as('getSchedules')
    cy.intercept('GET', `${Cypress.env('API_URL')}/schedules/${mockSchedule.id}`, { statusCode: 200, body: mockSchedule })
    visitClinic('/schedules', mockProfessionalUser)
    cy.wait('@getSchedules')
    cy.get(`[data-testid="schedule-view-link-${mockSchedule.id}"]`).click()
    expectClinicPath(`/schedules/${mockSchedule.id}`)
    cy.url().should('not.include', '/edit')
  })

  it('edit link navigates to schedule edit page', () => {
    cy.intercept('GET', `${Cypress.env('API_URL')}/schedules*`, { statusCode: 200, body: populatedListResponse }).as('getSchedules')
    cy.intercept('GET', `${Cypress.env('API_URL')}/schedules/${mockSchedule.id}`, { statusCode: 200, body: mockSchedule })
    visitClinic('/schedules', mockProfessionalUser)
    cy.wait('@getSchedules')
    cy.get(`[data-testid="schedule-edit-link-${mockSchedule.id}"]`).click()
    expectClinicPath(`/schedules/${mockSchedule.id}/edit`)
  })

  it('ADMIN can filter list by professional and request includes professionalId param', () => {
    cy.intercept('GET', `${Cypress.env('API_URL')}/schedules*`, { statusCode: 200, body: populatedListResponse }).as('getSchedules')
    visitClinic('/schedules', mockAdminUser)
    cy.wait('@getSchedules')

    cy.intercept('GET', `${Cypress.env('API_URL')}/schedules*`, { statusCode: 200, body: populatedListResponse }).as('filteredByProfessional')
    cy.get('[data-testid="schedule-filter-professional-select"]').select('doc-uuid-1')
    cy.wait('@filteredByProfessional').its('request.url').should('include', 'professionalId=doc-uuid-1')
  })

  it('filter by day of week sends dayOfWeek param', () => {
    cy.intercept('GET', `${Cypress.env('API_URL')}/schedules*`, { statusCode: 200, body: populatedListResponse }).as('getSchedules')
    visitClinic('/schedules', mockProfessionalUser)
    cy.wait('@getSchedules')

    cy.intercept('GET', `${Cypress.env('API_URL')}/schedules*`, { statusCode: 200, body: populatedListResponse }).as('filteredByDay')
    cy.get('[data-testid="schedule-filter-day"]').select('MONDAY')
    cy.wait('@filteredByDay').its('request.url').should('include', 'dayOfWeek=MONDAY')
  })
})

export {}
