import { visitClinic, expectClinicPath, CLINIC_SLUG, CLINIC_ID } from '../../support/clinic'

const mockProfessionalUser = {
  id: 'professional-user-uuid',
  fullName: 'Dr. João Silva',
  email: 'joao@test.com',
  role: 'professional',
}

const mockSchedule = {
  id: 'schedule-uuid-1',
  professionalId: 'doc-uuid-1',
  professionalName: 'Dr. Test',
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

    visitClinic(`/schedules/${mockSchedule.id}/edit`, mockProfessionalUser)
    cy.get('[data-testid="edit-schedule-skeleton"]').should('be.visible')
    cy.wait('@getScheduleSlow')
    cy.get('[data-testid="schedule-form"]').should('be.visible')
  })

  it('shows error state when schedule fails to load', () => {
    cy.intercept('GET', `${Cypress.env('API_URL')}/schedules/${mockSchedule.id}`, {
      statusCode: 500,
      body: { title: 'Internal Server Error' },
    }).as('getScheduleError')

    visitClinic(`/schedules/${mockSchedule.id}/edit`, mockProfessionalUser)
    cy.wait('@getScheduleError')
    cy.get('[data-testid="edit-schedule-error"]').should('be.visible')
    cy.get('[data-testid="schedule-form"]').should('not.exist')
  })

  it('loads schedule data into form fields', () => {
    visitClinic(`/schedules/${mockSchedule.id}/edit`, mockProfessionalUser)
    cy.wait('@getSchedule')

    cy.get('[data-testid="schedule-form-day"]').should('have.value', 'MONDAY')
    cy.get('[data-testid="schedule-form-start-time"]').should('have.value', '08:00')
    cy.get('[data-testid="schedule-form-end-time"]').should('have.value', '12:00')
    cy.get('[data-testid="schedule-form-slot"]').should('have.value', '30')
  })

  it('updates schedule and redirects to detail page', () => {
    cy.intercept('PATCH', `${Cypress.env('API_URL')}/schedules/${mockSchedule.id}`, { statusCode: 200, body: updatedSchedule }).as('updateSchedule')

    visitClinic(`/schedules/${mockSchedule.id}/edit`, mockProfessionalUser)
    cy.wait('@getSchedule')

    cy.get('[data-testid="schedule-form-start-time"]').clear().type('09:00')
    cy.get('[data-testid="schedule-form-submit"]').click()

    cy.wait('@updateSchedule')
    expectClinicPath(`/schedules/${mockSchedule.id}`)
    cy.url().should('not.include', '/edit')
  })

  it('sends correct fields in PATCH request', () => {
    cy.intercept('PATCH', `${Cypress.env('API_URL')}/schedules/${mockSchedule.id}`, { statusCode: 200, body: updatedSchedule }).as('updateSchedule')

    visitClinic(`/schedules/${mockSchedule.id}/edit`, mockProfessionalUser)
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
    visitClinic(`/schedules/${mockSchedule.id}/edit`, mockProfessionalUser)
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

    visitClinic(`/schedules/${mockSchedule.id}/edit`, mockProfessionalUser)
    cy.wait('@getSchedule')

    cy.get('[data-testid="schedule-form-start-time"]').clear().type('09:00')
    cy.get('[data-testid="schedule-form-submit"]').click()

    cy.wait('@updateSchedule')
    cy.get('[data-testid="schedule-form-error"]').should('be.visible').and('contain', 'conflita')
    cy.location('pathname').should('include', '/edit')
  })

  it('disables submit button while request is in flight', () => {
    cy.intercept('PATCH', `${Cypress.env('API_URL')}/schedules/${mockSchedule.id}`, (req) => {
      req.reply({ delay: 2000, statusCode: 200, body: updatedSchedule })
    }).as('updateSchedule')

    visitClinic(`/schedules/${mockSchedule.id}/edit`, mockProfessionalUser)
    cy.wait('@getSchedule')

    cy.get('[data-testid="schedule-form-start-time"]').clear().type('09:00')
    cy.get('[data-testid="schedule-form-submit"]').click()

    cy.get('[data-testid="schedule-form-submit"]').should('be.disabled')
    cy.wait('@updateSchedule')
  })

  it('back button returns to schedule detail page', () => {
    visitClinic(`/schedules/${mockSchedule.id}/edit`, mockProfessionalUser)
    cy.wait('@getSchedule')

    cy.get('[data-testid="edit-schedule-back-button"]').click()
    expectClinicPath(`/schedules/${mockSchedule.id}`)
    cy.url().should('not.include', '/edit')
  })
})

export {}
