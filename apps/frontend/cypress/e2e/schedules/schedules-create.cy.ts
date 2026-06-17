import { visitClinic, expectClinicPath, CLINIC_SLUG, CLINIC_ID } from '../../support/clinic'


const SPEC_ID_1 = '00000000-0000-4000-a000-000000000001'
const DOC_UUID = '00000000-0000-4000-b000-000000000001'

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

const mockCreatedSchedule = {
  id: 'new-schedule-uuid',
  doctorId: DOC_UUID,
  doctorName: 'Dr. Test',
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
      id: DOC_UUID,
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

describe('Schedules Create', () => {
  beforeEach(() => {
    cy.clearCookies()
    cy.clearLocalStorage()
    cy.intercept('GET', `${Cypress.env('API_URL')}/doctors*`, { statusCode: 200, body: mockDoctorsList })
    cy.intercept('GET', `${Cypress.env('API_URL')}/schedules*`, { statusCode: 200, body: { data: [], total: 0, page: 1, limit: 20 } })
  })

  it('DOCTOR: does not show doctor select field', () => {
    visitClinic('/schedules/new', mockDoctorUser)
    cy.get('[data-testid="schedule-form"]').should('be.visible')
    cy.get('[data-testid="schedule-form-doctor"]').should('not.exist')
  })

  it('ADMIN: shows doctor select field populated with doctors', () => {
    visitClinic('/schedules/new', mockAdminUser)
    cy.get('[data-testid="schedule-form-doctor"]').should('be.visible')
    cy.get('[data-testid="schedule-form-doctor"] option').should('have.length.gt', 1)
    cy.contains('Dr. João Silva').should('exist')
  })

  it('shows validation errors when submitting empty form as DOCTOR', () => {
    visitClinic('/schedules/new', mockDoctorUser)
    cy.get('[data-testid="schedule-form-submit"]').click()
    cy.get('[data-testid="schedule-form-day"]').should('have.attr', 'aria-invalid', 'true')
    cy.get('[data-testid="schedule-form-start-time"]').should('have.attr', 'aria-invalid', 'true')
  })

  it('shows validation error when endTime is before startTime', () => {
    visitClinic('/schedules/new', mockDoctorUser)
    cy.get('[data-testid="schedule-form-day"]').select('TUESDAY')
    cy.get('[data-testid="schedule-form-start-time"]').clear().type('13:00')
    cy.get('[data-testid="schedule-form-end-time"]').clear().type('09:00')
    cy.get('[data-testid="schedule-form-submit"]').click()
    cy.contains('Horário de fim deve ser após o início').should('be.visible')
  })

  it('shows validation error when interval is not divisible by slot duration', () => {
    visitClinic('/schedules/new', mockDoctorUser)
    cy.get('[data-testid="schedule-form-day"]').select('TUESDAY')
    cy.get('[data-testid="schedule-form-start-time"]').clear().type('08:00')
    cy.get('[data-testid="schedule-form-end-time"]').clear().type('09:00')
    cy.get('[data-testid="schedule-form-slot"]').type('{selectall}40')
    cy.get('[data-testid="schedule-form-submit"]').click()
    cy.contains('O intervalo de tempo deve ser divisível pela duração do slot').should('be.visible')
  })

  it('applies time mask — typing digits only auto-inserts colon', () => {
    visitClinic('/schedules/new', mockDoctorUser)
    cy.get('[data-testid="schedule-form-start-time"]').clear().type('0900')
    cy.get('[data-testid="schedule-form-start-time"]').should('have.value', '09:00')
  })

  it('DOCTOR: creates schedule and redirects to /schedules', () => {
    cy.intercept('POST', `${Cypress.env('API_URL')}/schedules`, { statusCode: 201, body: mockCreatedSchedule }).as('createSchedule')

    visitClinic('/schedules/new', mockDoctorUser)
    cy.get('[data-testid="schedule-form-day"]').select('TUESDAY')
    cy.get('[data-testid="schedule-form-start-time"]').clear().type('09:00')
    cy.get('[data-testid="schedule-form-end-time"]').clear().type('13:00')
    cy.get('[data-testid="schedule-form-slot"]').type('{selectall}60')
    cy.get('[data-testid="schedule-form-submit"]').click()

    cy.wait('@createSchedule')
    expectClinicPath('/schedules')
  })

  it('ADMIN: selects doctor and creates schedule', () => {
    cy.intercept('POST', `${Cypress.env('API_URL')}/schedules`, { statusCode: 201, body: mockCreatedSchedule }).as('createSchedule')

    visitClinic('/schedules/new', mockAdminUser)
    cy.get('[data-testid="schedule-form-doctor"]').select(DOC_UUID)
    cy.get('[data-testid="schedule-form-day"]').select('TUESDAY')
    cy.get('[data-testid="schedule-form-start-time"]').clear().type('09:00')
    cy.get('[data-testid="schedule-form-end-time"]').clear().type('13:00')
    cy.get('[data-testid="schedule-form-slot"]').type('{selectall}60')
    cy.get('[data-testid="schedule-form-submit"]').click()

    cy.wait('@createSchedule').its('request.body').should('have.property', 'doctorId', DOC_UUID)
    expectClinicPath('/schedules')
  })

  it('shows conflict error on 409 response', () => {
    cy.intercept('POST', `${Cypress.env('API_URL')}/schedules`, {
      statusCode: 409,
      body: { status: 409, title: 'Conflict', detail: 'Schedule overlaps' },
    }).as('createSchedule')

    visitClinic('/schedules/new', mockDoctorUser)
    cy.get('[data-testid="schedule-form-day"]').select('TUESDAY')
    cy.get('[data-testid="schedule-form-start-time"]').clear().type('09:00')
    cy.get('[data-testid="schedule-form-end-time"]').clear().type('13:00')
    cy.get('[data-testid="schedule-form-slot"]').type('{selectall}60')
    cy.get('[data-testid="schedule-form-submit"]').click()

    cy.wait('@createSchedule')
    cy.get('[data-testid="schedule-form-error"]').should('be.visible').and('contain', 'conflita')
    expectClinicPath('/schedules/new')
  })

  it('shows doctor not found error on 404 response', () => {
    cy.intercept('POST', `${Cypress.env('API_URL')}/schedules`, {
      statusCode: 404,
      body: { status: 404, title: 'Not Found', detail: 'Doctor not found' },
    }).as('createSchedule')

    visitClinic('/schedules/new', mockDoctorUser)
    cy.get('[data-testid="schedule-form-day"]').select('TUESDAY')
    cy.get('[data-testid="schedule-form-start-time"]').clear().type('09:00')
    cy.get('[data-testid="schedule-form-end-time"]').clear().type('13:00')
    cy.get('[data-testid="schedule-form-slot"]').type('{selectall}60')
    cy.get('[data-testid="schedule-form-submit"]').click()

    cy.wait('@createSchedule')
    cy.get('[data-testid="schedule-form-error"]').should('be.visible').and('contain', 'Médico não encontrado')
  })

  it('disables submit button while request is in flight', () => {
    cy.intercept('POST', `${Cypress.env('API_URL')}/schedules`, (req) => {
      req.reply({ delay: 2000, statusCode: 201, body: mockCreatedSchedule })
    }).as('createSchedule')

    visitClinic('/schedules/new', mockDoctorUser)
    cy.get('[data-testid="schedule-form-day"]').select('TUESDAY')
    cy.get('[data-testid="schedule-form-start-time"]').clear().type('09:00')
    cy.get('[data-testid="schedule-form-end-time"]').clear().type('13:00')
    cy.get('[data-testid="schedule-form-slot"]').type('{selectall}60')
    cy.get('[data-testid="schedule-form-submit"]').click()

    cy.get('[data-testid="schedule-form-submit"]').should('be.disabled')
    cy.wait('@createSchedule')
  })

  it('back button returns to /schedules without creating', () => {
    visitClinic('/schedules/new', mockDoctorUser)
    cy.get('[data-testid="new-schedule-back-button"]').click()
    expectClinicPath('/schedules')
  })
})

export {}
