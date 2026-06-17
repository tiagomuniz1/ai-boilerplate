import { visitClinic, expectClinicPath, CLINIC_SLUG, CLINIC_ID } from '../../support/clinic'

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

const mockScheduleWithValidity = {
  ...mockSchedule,
  id: 'schedule-uuid-2',
  validFrom: '2025-01-01',
  validUntil: '2025-12-31',
}

describe('Schedule Detail', () => {
  beforeEach(() => {
    cy.clearCookies()
    cy.clearLocalStorage()
  })

  it('shows skeleton while loading', () => {
    cy.intercept('GET', `${Cypress.env('API_URL')}/schedules/${mockSchedule.id}`, (req) => {
      req.reply({ delay: 500, statusCode: 200, body: mockSchedule })
    }).as('getScheduleSlow')

    visitClinic(`/schedules/${mockSchedule.id}`, mockDoctorUser)
    cy.get('[data-testid="schedule-details-skeleton"]').should('be.visible')
    cy.wait('@getScheduleSlow')
    cy.get('[data-testid="schedule-details"]').should('be.visible')
  })

  it('shows all schedule details on success', () => {
    cy.intercept('GET', `${Cypress.env('API_URL')}/schedules/${mockSchedule.id}`, { statusCode: 200, body: mockSchedule }).as('getSchedule')

    visitClinic(`/schedules/${mockSchedule.id}`, mockDoctorUser)
    cy.wait('@getSchedule')

    cy.get('[data-testid="schedule-details"]').should('be.visible')
    cy.get('[data-testid="schedule-details-day"]').should('contain', 'Segunda-feira')
    cy.get('[data-testid="schedule-details-time-range"]').should('contain', '08:00 – 12:00')
    cy.get('[data-testid="schedule-details-slot"]').should('contain', '30 minutos')
  })

  it('shows "Indefinido" for validity when not set', () => {
    cy.intercept('GET', `${Cypress.env('API_URL')}/schedules/${mockSchedule.id}`, { statusCode: 200, body: mockSchedule }).as('getSchedule')

    visitClinic(`/schedules/${mockSchedule.id}`, mockDoctorUser)
    cy.wait('@getSchedule')

    cy.get('[data-testid="schedule-details-valid-from"]').should('contain', 'Indefinido')
    cy.get('[data-testid="schedule-details-valid-until"]').should('contain', 'Indefinido')
  })

  it('shows validity dates when set', () => {
    cy.intercept('GET', `${Cypress.env('API_URL')}/schedules/${mockScheduleWithValidity.id}`, { statusCode: 200, body: mockScheduleWithValidity }).as('getSchedule')

    visitClinic(`/schedules/${mockScheduleWithValidity.id}`, mockDoctorUser)
    cy.wait('@getSchedule')

    cy.get('[data-testid="schedule-details-valid-from"]').should('contain', '2025-01-01')
    cy.get('[data-testid="schedule-details-valid-until"]').should('contain', '2025-12-31')
  })

  it('shows edit and delete action buttons', () => {
    cy.intercept('GET', `${Cypress.env('API_URL')}/schedules/${mockSchedule.id}`, { statusCode: 200, body: mockSchedule }).as('getSchedule')

    visitClinic(`/schedules/${mockSchedule.id}`, mockDoctorUser)
    cy.wait('@getSchedule')

    cy.get('[data-testid="schedule-details-edit-button"]').should('be.visible')
    cy.get('[data-testid="schedule-details-delete-button"]').should('be.visible')
  })

  it('edit button navigates to edit page', () => {
    cy.intercept('GET', `${Cypress.env('API_URL')}/schedules/${mockSchedule.id}`, { statusCode: 200, body: mockSchedule }).as('getSchedule')

    visitClinic(`/schedules/${mockSchedule.id}`, mockDoctorUser)
    cy.wait('@getSchedule')

    cy.get('[data-testid="schedule-details-edit-button"]').click()
    expectClinicPath(`/schedules/${mockSchedule.id}/edit`)
  })

  it('back button navigates to schedules list', () => {
    cy.intercept('GET', `${Cypress.env('API_URL')}/schedules/${mockSchedule.id}`, { statusCode: 200, body: mockSchedule }).as('getSchedule')
    cy.intercept('GET', `${Cypress.env('API_URL')}/schedules*`, { statusCode: 200, body: { data: [], total: 0, page: 1, limit: 20 } })
    cy.intercept('GET', `${Cypress.env('API_URL')}/doctors*`, { statusCode: 200, body: { data: [], total: 0, page: 1, limit: 100 } })

    visitClinic(`/schedules/${mockSchedule.id}`, mockDoctorUser)
    cy.wait('@getSchedule')

    cy.get('[data-testid="schedule-details-back-button"]').click()
    expectClinicPath('/schedules')
  })

  it('shows 403 forbidden error', () => {
    cy.intercept('GET', `${Cypress.env('API_URL')}/schedules/${mockSchedule.id}`, {
      statusCode: 403,
      body: { status: 403, title: 'Forbidden', detail: 'Access denied' },
    }).as('getSchedule')

    visitClinic(`/schedules/${mockSchedule.id}`, mockDoctorUser)
    cy.wait('@getSchedule')

    cy.get('[data-testid="schedule-details-forbidden"]').should('be.visible').and('contain', 'permissão')
    cy.get('[data-testid="schedule-details"]').should('not.exist')
  })

  it('shows 404 not found error', () => {
    cy.intercept('GET', `${Cypress.env('API_URL')}/schedules/${mockSchedule.id}`, {
      statusCode: 404,
      body: { status: 404, title: 'Not Found', detail: 'Schedule not found' },
    }).as('getSchedule')

    visitClinic(`/schedules/${mockSchedule.id}`, mockDoctorUser)
    cy.wait('@getSchedule')

    cy.get('[data-testid="schedule-details-not-found"]').should('be.visible').and('contain', 'não encontrada')
    cy.get('[data-testid="schedule-details"]').should('not.exist')
  })

  it('shows generic error for unexpected failures', () => {
    cy.intercept('GET', `${Cypress.env('API_URL')}/schedules/${mockSchedule.id}`, {
      statusCode: 500,
      body: { status: 500, title: 'Internal Server Error' },
    }).as('getSchedule')

    visitClinic(`/schedules/${mockSchedule.id}`, mockDoctorUser)
    cy.wait('@getSchedule')

    cy.get('[data-testid="schedule-details-error"]').should('be.visible')
    cy.get('[data-testid="schedule-details"]').should('not.exist')
  })
})

export {}
