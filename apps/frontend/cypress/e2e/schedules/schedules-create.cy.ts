const MOCK_TOKEN = 'mock-access-token'

const mockDoctorUser = {
  id: 'doctor-user-uuid',
  fullName: 'Dr. João Silva',
  email: 'joao@test.com',
  role: 'DOCTOR',
}

const mockAdminUser = {
  id: 'admin-user-uuid',
  fullName: 'Admin User',
  email: 'admin@test.com',
  role: 'ADMIN',
}

const mockCreatedSchedule = {
  id: 'new-schedule-uuid',
  doctorId: 'doc-uuid-1',
  dayOfWeek: 'TUESDAY',
  startTime: '09:00',
  endTime: '13:00',
  slotDurationInMinutes: 60,
  validFrom: null,
  validUntil: null,
  createdAt: '2025-01-01T10:00:00.000Z',
  updatedAt: '2025-01-01T10:00:00.000Z',
}

const mockDoctorsList = {
  data: [
    {
      id: 'doc-uuid-1',
      user: { id: 'user-uuid-1', fullName: 'Dr. João Silva', email: 'joao@test.com' },
      crmNumber: '12345/SP',
      specialty: 'Cardiologia',
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

describe('Schedules Create', () => {
  beforeEach(() => {
    cy.clearCookies()
    cy.clearLocalStorage()
    cy.intercept('GET', `${Cypress.env('API_URL')}/doctors*`, { statusCode: 200, body: mockDoctorsList })
    cy.intercept('GET', `${Cypress.env('API_URL')}/schedules*`, { statusCode: 200, body: { data: [], total: 0, page: 1, limit: 20 } })
  })

  it('DOCTOR: does not show doctor select field', () => {
    visitAsDoctor('/schedules/new')
    cy.get('[data-testid="schedule-form"]').should('be.visible')
    cy.get('[data-testid="schedule-form-doctor"]').should('not.exist')
  })

  it('ADMIN: shows doctor select field populated with doctors', () => {
    visitAsAdmin('/schedules/new')
    cy.get('[data-testid="schedule-form-doctor"]').should('be.visible')
    cy.get('[data-testid="schedule-form-doctor"] option').should('have.length.gt', 1)
    cy.contains('Dr. João Silva').should('exist')
  })

  it('shows validation errors when submitting empty form as DOCTOR', () => {
    visitAsDoctor('/schedules/new')
    cy.get('[data-testid="schedule-form-submit"]').click()
    cy.contains('Dia da semana obrigatório').should('be.visible')
    cy.contains('Horário inválido').should('be.visible')
  })

  it('shows validation error when endTime is before startTime', () => {
    visitAsDoctor('/schedules/new')
    cy.get('[data-testid="schedule-form-day"]').select('TUESDAY')
    cy.get('[data-testid="schedule-form-start-time"]').clear().type('13:00')
    cy.get('[data-testid="schedule-form-end-time"]').clear().type('09:00')
    cy.get('[data-testid="schedule-form-submit"]').click()
    cy.contains('Horário de fim deve ser após o início').should('be.visible')
  })

  it('shows validation error when interval is not divisible by slot duration', () => {
    visitAsDoctor('/schedules/new')
    cy.get('[data-testid="schedule-form-day"]').select('TUESDAY')
    cy.get('[data-testid="schedule-form-start-time"]').clear().type('08:00')
    cy.get('[data-testid="schedule-form-end-time"]').clear().type('09:00')
    cy.get('[data-testid="schedule-form-slot"]').clear().type('40')
    cy.get('[data-testid="schedule-form-submit"]').click()
    cy.contains('O intervalo de tempo deve ser divisível pela duração do slot').should('be.visible')
  })

  it('applies time mask — typing digits only auto-inserts colon', () => {
    visitAsDoctor('/schedules/new')
    cy.get('[data-testid="schedule-form-start-time"]').clear().type('0900')
    cy.get('[data-testid="schedule-form-start-time"]').should('have.value', '09:00')
  })

  it('DOCTOR: creates schedule and redirects to /schedules', () => {
    cy.intercept('POST', `${Cypress.env('API_URL')}/schedules`, { statusCode: 201, body: mockCreatedSchedule }).as('createSchedule')

    visitAsDoctor('/schedules/new')
    cy.get('[data-testid="schedule-form-day"]').select('TUESDAY')
    cy.get('[data-testid="schedule-form-start-time"]').clear().type('09:00')
    cy.get('[data-testid="schedule-form-end-time"]').clear().type('13:00')
    cy.get('[data-testid="schedule-form-slot"]').clear().type('60')
    cy.get('[data-testid="schedule-form-submit"]').click()

    cy.wait('@createSchedule')
    cy.url().should('match', /\/schedules$/)
  })

  it('ADMIN: selects doctor and creates schedule', () => {
    cy.intercept('POST', `${Cypress.env('API_URL')}/schedules`, { statusCode: 201, body: mockCreatedSchedule }).as('createSchedule')

    visitAsAdmin('/schedules/new')
    cy.get('[data-testid="schedule-form-doctor"]').select('doc-uuid-1')
    cy.get('[data-testid="schedule-form-day"]').select('TUESDAY')
    cy.get('[data-testid="schedule-form-start-time"]').clear().type('09:00')
    cy.get('[data-testid="schedule-form-end-time"]').clear().type('13:00')
    cy.get('[data-testid="schedule-form-slot"]').clear().type('60')
    cy.get('[data-testid="schedule-form-submit"]').click()

    cy.wait('@createSchedule').its('request.body').should('have.property', 'doctorId', 'doc-uuid-1')
    cy.url().should('match', /\/schedules$/)
  })

  it('shows conflict error on 409 response', () => {
    cy.intercept('POST', `${Cypress.env('API_URL')}/schedules`, {
      statusCode: 409,
      body: { status: 409, title: 'Conflict', detail: 'Schedule overlaps' },
    }).as('createSchedule')

    visitAsDoctor('/schedules/new')
    cy.get('[data-testid="schedule-form-day"]').select('TUESDAY')
    cy.get('[data-testid="schedule-form-start-time"]').clear().type('09:00')
    cy.get('[data-testid="schedule-form-end-time"]').clear().type('13:00')
    cy.get('[data-testid="schedule-form-slot"]').clear().type('60')
    cy.get('[data-testid="schedule-form-submit"]').click()

    cy.wait('@createSchedule')
    cy.get('[data-testid="schedule-form-error"]').should('be.visible').and('contain', 'conflita')
    cy.url().should('include', '/schedules/new')
  })

  it('shows doctor not found error on 404 response', () => {
    cy.intercept('POST', `${Cypress.env('API_URL')}/schedules`, {
      statusCode: 404,
      body: { status: 404, title: 'Not Found', detail: 'Doctor not found' },
    }).as('createSchedule')

    visitAsDoctor('/schedules/new')
    cy.get('[data-testid="schedule-form-day"]').select('TUESDAY')
    cy.get('[data-testid="schedule-form-start-time"]').clear().type('09:00')
    cy.get('[data-testid="schedule-form-end-time"]').clear().type('13:00')
    cy.get('[data-testid="schedule-form-slot"]').clear().type('60')
    cy.get('[data-testid="schedule-form-submit"]').click()

    cy.wait('@createSchedule')
    cy.get('[data-testid="schedule-form-error"]').should('be.visible').and('contain', 'Médico não encontrado')
  })

  it('disables submit button while request is in flight', () => {
    cy.intercept('POST', `${Cypress.env('API_URL')}/schedules`, (req) => {
      req.reply({ delay: 2000, statusCode: 201, body: mockCreatedSchedule })
    }).as('createSchedule')

    visitAsDoctor('/schedules/new')
    cy.get('[data-testid="schedule-form-day"]').select('TUESDAY')
    cy.get('[data-testid="schedule-form-start-time"]').clear().type('09:00')
    cy.get('[data-testid="schedule-form-end-time"]').clear().type('13:00')
    cy.get('[data-testid="schedule-form-slot"]').clear().type('60')
    cy.get('[data-testid="schedule-form-submit"]').click()

    cy.get('[data-testid="schedule-form-submit"]').should('be.disabled')
    cy.wait('@createSchedule')
  })

  it('back button returns to /schedules without creating', () => {
    visitAsDoctor('/schedules/new')
    cy.get('[data-testid="new-schedule-back-button"]').click()
    cy.url().should('match', /\/schedules$/)
  })
})

export {}
