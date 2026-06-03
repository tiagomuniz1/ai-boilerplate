const MOCK_TOKEN = 'mock-access-token'

const mockDoctorUser = {
  id: 'doctor-user-uuid',
  fullName: 'Dr. João Silva',
  email: 'joao@test.com',
  role: 'doctor',
}

const mockSchedule = {
  id: 'schedule-uuid-1',
  doctorId: 'doc-uuid-1',
  doctorName: 'Dr. Test',
  dayOfWeek: 'MONDAY',
  startTime: '08:00',
  endTime: '12:00',
  slotDurationInMinutes: 30,
  validFrom: null,
  validUntil: null,
  createdAt: '2025-01-01T10:00:00.000Z',
  updatedAt: '2025-01-01T10:00:00.000Z',
}

const updatedSchedule = { ...mockSchedule, startTime: '09:00' }

function visitAsDoctor(url: string) {
  cy.intercept('GET', `${Cypress.env('API_URL')}/auth/me`, { statusCode: 200, body: mockDoctorUser })
  cy.setCookie('access_token', MOCK_TOKEN, { httpOnly: true, secure: false, sameSite: 'strict', path: '/', domain: 'localhost' })
  cy.visit(url, {
    onBeforeLoad(win) {
      win.localStorage.setItem('auth-user', JSON.stringify({ state: { user: mockDoctorUser }, version: 0 }))
    },
  })
}

describe('Schedules Update', () => {
  beforeEach(() => {
    cy.clearCookies()
    cy.clearLocalStorage()
    cy.intercept('GET', `${Cypress.env('API_URL')}/schedules/${mockSchedule.id}`, { statusCode: 200, body: mockSchedule }).as('getSchedule')
  })

  it('shows skeleton while loading schedule data', () => {
    cy.intercept('GET', `${Cypress.env('API_URL')}/schedules/${mockSchedule.id}`, (req) => {
      req.reply({ delay: 500, statusCode: 200, body: mockSchedule })
    }).as('getScheduleSlow')

    visitAsDoctor(`/schedules/${mockSchedule.id}/edit`)
    cy.get('[data-testid="edit-schedule-skeleton"]').should('be.visible')
    cy.wait('@getScheduleSlow')
    cy.get('[data-testid="schedule-form"]').should('be.visible')
  })

  it('shows error state when schedule fails to load', () => {
    cy.intercept('GET', `${Cypress.env('API_URL')}/schedules/${mockSchedule.id}`, {
      statusCode: 500,
      body: { title: 'Internal Server Error' },
    }).as('getScheduleError')

    visitAsDoctor(`/schedules/${mockSchedule.id}/edit`)
    cy.wait('@getScheduleError')
    cy.get('[data-testid="edit-schedule-error"]').should('be.visible')
    cy.get('[data-testid="schedule-form"]').should('not.exist')
  })

  it('loads schedule data into form fields', () => {
    visitAsDoctor(`/schedules/${mockSchedule.id}/edit`)
    cy.wait('@getSchedule')

    cy.get('[data-testid="schedule-form-day"]').should('have.value', 'MONDAY')
    cy.get('[data-testid="schedule-form-start-time"]').should('have.value', '08:00')
    cy.get('[data-testid="schedule-form-end-time"]').should('have.value', '12:00')
    cy.get('[data-testid="schedule-form-slot"]').should('have.value', '30')
  })

  it('updates schedule and redirects to detail page', () => {
    cy.intercept('PATCH', `${Cypress.env('API_URL')}/schedules/${mockSchedule.id}`, { statusCode: 200, body: updatedSchedule }).as('updateSchedule')

    visitAsDoctor(`/schedules/${mockSchedule.id}/edit`)
    cy.wait('@getSchedule')

    cy.get('[data-testid="schedule-form-start-time"]').clear().type('09:00')
    cy.get('[data-testid="schedule-form-submit"]').click()

    cy.wait('@updateSchedule')
    cy.url().should('include', `/schedules/${mockSchedule.id}`)
    cy.url().should('not.include', '/edit')
  })

  it('sends correct fields in PATCH request', () => {
    cy.intercept('PATCH', `${Cypress.env('API_URL')}/schedules/${mockSchedule.id}`, { statusCode: 200, body: updatedSchedule }).as('updateSchedule')

    visitAsDoctor(`/schedules/${mockSchedule.id}/edit`)
    cy.wait('@getSchedule')

    cy.get('[data-testid="schedule-form-day"]').select('WEDNESDAY')
    cy.get('[data-testid="schedule-form-start-time"]').clear().type('09:00')
    cy.get('[data-testid="schedule-form-submit"]').click()

    cy.wait('@updateSchedule').its('request.body').should('deep.include', {
      dayOfWeek: 'WEDNESDAY',
      startTime: '09:00',
    })
  })

  it('shows validation error when endTime is before startTime', () => {
    visitAsDoctor(`/schedules/${mockSchedule.id}/edit`)
    cy.wait('@getSchedule')

    cy.get('[data-testid="schedule-form-start-time"]').clear().type('14:00')
    cy.get('[data-testid="schedule-form-end-time"]').clear().type('10:00')
    cy.get('[data-testid="schedule-form-submit"]').click()

    cy.contains('Horário de fim deve ser após o início').should('be.visible')
  })

  it('shows conflict error on 409 response', () => {
    cy.intercept('PATCH', `${Cypress.env('API_URL')}/schedules/${mockSchedule.id}`, {
      statusCode: 409,
      body: { status: 409, title: 'Conflict', detail: 'Schedule overlaps' },
    }).as('updateSchedule')

    visitAsDoctor(`/schedules/${mockSchedule.id}/edit`)
    cy.wait('@getSchedule')

    cy.get('[data-testid="schedule-form-start-time"]').clear().type('09:00')
    cy.get('[data-testid="schedule-form-submit"]').click()

    cy.wait('@updateSchedule')
    cy.get('[data-testid="schedule-form-error"]').should('be.visible').and('contain', 'conflita')
    cy.url().should('include', '/edit')
  })

  it('disables submit button while request is in flight', () => {
    cy.intercept('PATCH', `${Cypress.env('API_URL')}/schedules/${mockSchedule.id}`, (req) => {
      req.reply({ delay: 2000, statusCode: 200, body: updatedSchedule })
    }).as('updateSchedule')

    visitAsDoctor(`/schedules/${mockSchedule.id}/edit`)
    cy.wait('@getSchedule')

    cy.get('[data-testid="schedule-form-start-time"]').clear().type('09:00')
    cy.get('[data-testid="schedule-form-submit"]').click()

    cy.get('[data-testid="schedule-form-submit"]').should('be.disabled')
    cy.wait('@updateSchedule')
  })

  it('back button returns to schedule detail page', () => {
    visitAsDoctor(`/schedules/${mockSchedule.id}/edit`)
    cy.wait('@getSchedule')

    cy.get('[data-testid="edit-schedule-back-button"]').click()
    cy.url().should('include', `/schedules/${mockSchedule.id}`)
    cy.url().should('not.include', '/edit')
  })
})

export {}
