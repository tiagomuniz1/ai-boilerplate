const MOCK_TOKEN = 'mock-access-token'

const SPEC_ID_1 = '00000000-0000-4000-a000-000000000001'

const mockDoctorUser = {
  id: 'doctor-user-uuid',
  fullName: 'Dr. João Silva',
  email: 'joao@test.com',
  role: 'doctor',
}

const mockAdminUser = {
  id: 'admin-user-uuid',
  fullName: 'Admin User',
  email: 'admin@test.com',
  role: 'admin',
}

const mockSchedule = {
  id: 'schedule-uuid-1',
  doctorId: 'doc-uuid-1',
  doctorName: 'Dr. João Silva',
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

const mockDoctorsList = {
  data: [
    {
      id: 'doc-uuid-1',
      user: { id: 'user-uuid-1', fullName: 'Dr. João Silva', email: 'joao@test.com' },
      crmNumber: '12345/SP',
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

function visitAsDoctor(url: string) {
  cy.intercept('GET', `${Cypress.env('API_URL')}/auth/me`, { statusCode: 200, body: mockDoctorUser })
  cy.setCookie('access_token', MOCK_TOKEN, { httpOnly: true, secure: false, sameSite: 'strict', path: '/', domain: 'localhost' })
  cy.visit(url, {
    onBeforeLoad(win) {
      win.localStorage.setItem('auth-user', JSON.stringify({ state: { user: mockDoctorUser }, version: 0 }))
    },
  })
}

function visitAsAdmin(url: string) {
  cy.intercept('GET', `${Cypress.env('API_URL')}/auth/me`, { statusCode: 200, body: mockAdminUser })
  cy.setCookie('access_token', MOCK_TOKEN, { httpOnly: true, secure: false, sameSite: 'strict', path: '/', domain: 'localhost' })
  cy.visit(url, {
    onBeforeLoad(win) {
      win.localStorage.setItem('auth-user', JSON.stringify({ state: { user: mockAdminUser }, version: 0 }))
    },
  })
}

describe('Schedules List', () => {
  beforeEach(() => {
    cy.clearCookies()
    cy.clearLocalStorage()
    cy.intercept('GET', `${Cypress.env('API_URL')}/doctors*`, { statusCode: 200, body: mockDoctorsList })
  })

  it('redirects to /login when not authenticated', () => {
    cy.visit('/schedules')
    cy.url().should('include', '/login')
  })

  it('shows empty state when no schedules exist', () => {
    cy.intercept('GET', `${Cypress.env('API_URL')}/schedules*`, { statusCode: 200, body: emptyListResponse }).as('getSchedules')
    visitAsDoctor('/schedules')
    cy.wait('@getSchedules')
    cy.get('[data-testid="schedule-list-empty"]').should('be.visible')
    cy.get('[data-testid="schedule-list-table"]').should('not.exist')
  })

  it('shows total count of schedules found', () => {
    cy.intercept('GET', `${Cypress.env('API_URL')}/schedules*`, { statusCode: 200, body: populatedListResponse }).as('getSchedules')
    visitAsDoctor('/schedules')
    cy.wait('@getSchedules')
    cy.contains('1 agenda encontrada').should('be.visible')
  })

  it('shows table with schedule rows', () => {
    cy.intercept('GET', `${Cypress.env('API_URL')}/schedules*`, { statusCode: 200, body: populatedListResponse }).as('getSchedules')
    visitAsDoctor('/schedules')
    cy.wait('@getSchedules')
    cy.get('[data-testid="schedule-list-table"]').should('be.visible')
    cy.get(`[data-testid="schedule-table-row-${mockSchedule.id}"]`).should('exist')
    cy.get(`[data-testid="schedule-day-${mockSchedule.id}"]`).should('contain', 'Segunda-feira')
    cy.get(`[data-testid="schedule-time-${mockSchedule.id}"]`).should('contain', '08:00')
    cy.get(`[data-testid="schedule-slot-${mockSchedule.id}"]`).should('contain', '30 min')
  })

  it('hides doctor filter and doctor column for DOCTOR role', () => {
    cy.intercept('GET', `${Cypress.env('API_URL')}/schedules*`, { statusCode: 200, body: populatedListResponse }).as('getSchedules')
    visitAsDoctor('/schedules')
    cy.wait('@getSchedules')
    cy.get('[data-testid="schedule-filter-doctor"]').should('not.exist')
    cy.get(`[data-testid="schedule-doctor-${mockSchedule.id}"]`).should('not.exist')
  })

  it('shows doctor filter and doctor column for ADMIN role', () => {
    cy.intercept('GET', `${Cypress.env('API_URL')}/schedules*`, { statusCode: 200, body: populatedListResponse }).as('getSchedules')
    visitAsAdmin('/schedules')
    cy.wait('@getSchedules')
    cy.get('[data-testid="schedule-filter-doctor"]').should('be.visible')
    cy.get(`[data-testid="schedule-doctor-${mockSchedule.id}"]`).should('contain', 'Dr. João Silva')
  })

  it('shows error alert when API fails', () => {
    cy.intercept('GET', `${Cypress.env('API_URL')}/schedules*`, { statusCode: 500, body: { title: 'Internal Server Error' } }).as('getSchedules')
    visitAsDoctor('/schedules')
    cy.wait('@getSchedules')
    cy.get('[data-testid="schedule-list-error"]').should('be.visible')
    cy.get('[data-testid="schedule-list-table"]').should('not.exist')
  })

  it('shows "Nova agenda" button', () => {
    cy.intercept('GET', `${Cypress.env('API_URL')}/schedules*`, { statusCode: 200, body: emptyListResponse }).as('getSchedules')
    visitAsDoctor('/schedules')
    cy.wait('@getSchedules')
    cy.get('[data-testid="schedule-list-new-button"]').should('be.visible')
  })

  it('"Nova agenda" button navigates to /schedules/new', () => {
    cy.intercept('GET', `${Cypress.env('API_URL')}/schedules*`, { statusCode: 200, body: emptyListResponse }).as('getSchedules')
    visitAsDoctor('/schedules')
    cy.wait('@getSchedules')
    cy.get('[data-testid="schedule-list-new-button"]').click()
    cy.url().should('include', '/schedules/new')
  })

  it('view link navigates to schedule detail page', () => {
    cy.intercept('GET', `${Cypress.env('API_URL')}/schedules*`, { statusCode: 200, body: populatedListResponse }).as('getSchedules')
    cy.intercept('GET', `${Cypress.env('API_URL')}/schedules/${mockSchedule.id}`, { statusCode: 200, body: mockSchedule })
    visitAsDoctor('/schedules')
    cy.wait('@getSchedules')
    cy.get(`[data-testid="schedule-view-link-${mockSchedule.id}"]`).click()
    cy.url().should('include', `/schedules/${mockSchedule.id}`)
    cy.url().should('not.include', '/edit')
  })

  it('edit link navigates to schedule edit page', () => {
    cy.intercept('GET', `${Cypress.env('API_URL')}/schedules*`, { statusCode: 200, body: populatedListResponse }).as('getSchedules')
    cy.intercept('GET', `${Cypress.env('API_URL')}/schedules/${mockSchedule.id}`, { statusCode: 200, body: mockSchedule })
    visitAsDoctor('/schedules')
    cy.wait('@getSchedules')
    cy.get(`[data-testid="schedule-edit-link-${mockSchedule.id}"]`).click()
    cy.url().should('include', `/schedules/${mockSchedule.id}/edit`)
  })

  it('ADMIN can filter list by doctor and request includes doctorId param', () => {
    cy.intercept('GET', `${Cypress.env('API_URL')}/schedules*`, { statusCode: 200, body: populatedListResponse }).as('getSchedules')
    visitAsAdmin('/schedules')
    cy.wait('@getSchedules')

    cy.intercept('GET', `${Cypress.env('API_URL')}/schedules*`, { statusCode: 200, body: populatedListResponse }).as('filteredByDoctor')
    cy.get('[data-testid="schedule-filter-doctor-select"]').select('doc-uuid-1')
    cy.wait('@filteredByDoctor').its('request.url').should('include', 'doctorId=doc-uuid-1')
  })

  it('filter by day of week sends dayOfWeek param', () => {
    cy.intercept('GET', `${Cypress.env('API_URL')}/schedules*`, { statusCode: 200, body: populatedListResponse }).as('getSchedules')
    visitAsDoctor('/schedules')
    cy.wait('@getSchedules')

    cy.intercept('GET', `${Cypress.env('API_URL')}/schedules*`, { statusCode: 200, body: populatedListResponse }).as('filteredByDay')
    cy.get('[data-testid="schedule-filter-day"]').select('MONDAY')
    cy.wait('@filteredByDay').its('request.url').should('include', 'dayOfWeek=MONDAY')
  })
})

export {}
