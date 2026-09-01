import { visitClinic, expectClinicPath, CLINIC_SLUG, CLINIC_ID } from '../../support/clinic'


const SPEC_ID_1 = '00000000-0000-4000-a000-000000000001'
const DOC_UUID = '00000000-0000-4000-b000-000000000001'

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

const mockCreatedSchedule = {
  id: 'new-schedule-uuid',
  professionalId: DOC_UUID,
  professionalName: 'Dr. Test',
  dayOfWeek: 'TUESDAY',
  startTime: '09:00',
  endTime: '13:00',
  slotDurationInMinutes: 60,
  validFrom: null,
  validUntil: null,
  createdAt: '2025-01-01T10:00:00.000Z',
  updatedAt: '2025-01-01T10:00:00.000Z',
}

const mockProfessionalsList = {
  data: [
    {
      id: DOC_UUID,
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

describe('Schedules Create', () => {
  beforeEach(() => {
    cy.clearCookies()
    cy.clearLocalStorage()
    // A ficha do próprio usuário: neste spec ele é o profissional.
    // O glob `/professionals*` não cobre esta rota — `*` não atravessa a barra.
    cy.intercept('GET', `${Cypress.env('API_URL')}/professionals/me`, { statusCode: 200, body: mockProfessionalsList.data[0] })
    cy.intercept('GET', `${Cypress.env('API_URL')}/professionals*`, { statusCode: 200, body: mockProfessionalsList })
    cy.intercept('GET', `${Cypress.env('API_URL')}/schedules*`, { statusCode: 200, body: { data: [], total: 0, page: 1, limit: 20 } })
  })

  it('PROFESSIONAL: does not show professional select field', () => {
    visitClinic('/schedules/new', mockProfessionalUser)
    cy.get('[data-testid="schedule-form"]').should('be.visible')
    cy.get('[data-testid="schedule-form-professional"]').should('not.exist')
  })

  it('ADMIN: shows professional select field populated with professionals', () => {
    visitClinic('/schedules/new', mockAdminUser)
    cy.get('[data-testid="schedule-form-professional"]').should('be.visible')
    cy.get('[data-testid="schedule-form-professional"] option').should('have.length.gt', 1)
    cy.contains('Dr. João Silva').should('exist')
  })

  it('shows validation errors when submitting empty form as PROFESSIONAL', () => {
    visitClinic('/schedules/new', mockProfessionalUser)
    cy.get('[data-testid="schedule-form-submit"]').click()
    cy.get('[data-testid="schedule-form-day"]').should('have.attr', 'aria-invalid', 'true')
    cy.get('[data-testid="schedule-form-start-time"]').should('have.attr', 'aria-invalid', 'true')
  })

  it('shows validation error when endTime is before startTime', () => {
    visitClinic('/schedules/new', mockProfessionalUser)
    cy.get('[data-testid="schedule-form-day"]').select('TUESDAY')
    cy.get('[data-testid="schedule-form-start-time"]').clear().type('13:00')
    cy.get('[data-testid="schedule-form-end-time"]').clear().type('09:00')
    cy.get('[data-testid="schedule-form-submit"]').click()
    cy.contains('Horário de fim deve ser após o início').should('be.visible')
  })

  it('shows validation error when interval is not divisible by slot duration', () => {
    visitClinic('/schedules/new', mockProfessionalUser)
    cy.get('[data-testid="schedule-form-day"]').select('TUESDAY')
    cy.get('[data-testid="schedule-form-start-time"]').clear().type('08:00')
    cy.get('[data-testid="schedule-form-end-time"]').clear().type('09:00')
    cy.get('[data-testid="schedule-form-slot"]').type('{selectall}40')
    cy.get('[data-testid="schedule-form-submit"]').click()
    cy.contains('O intervalo de tempo deve ser divisível pela duração do slot').should('be.visible')
  })

  it('applies time mask — typing digits only auto-inserts colon', () => {
    visitClinic('/schedules/new', mockProfessionalUser)
    cy.get('[data-testid="schedule-form-start-time"]').clear().type('0900')
    cy.get('[data-testid="schedule-form-start-time"]').should('have.value', '09:00')
  })

  // Real-backend happy path (PROFESSIONAL creating own schedule, ADMIN creating
  // on behalf of a professional) lives in schedules-happy-path-real.cy.ts.

  it('shows conflict error on 409 response', () => {
    cy.intercept('POST', `${Cypress.env('API_URL')}/schedules`, {
      statusCode: 409,
      body: { status: 409, title: 'Conflict', detail: 'Schedule overlaps' },
    }).as('createSchedule')

    visitClinic('/schedules/new', mockProfessionalUser)
    cy.get('[data-testid="schedule-form-day"]').select('TUESDAY')
    cy.get('[data-testid="schedule-form-start-time"]').clear().type('09:00')
    cy.get('[data-testid="schedule-form-end-time"]').clear().type('13:00')
    cy.get('[data-testid="schedule-form-slot"]').type('{selectall}60')
    cy.get('[data-testid="schedule-form-submit"]').click()

    cy.wait('@createSchedule')
    cy.get('[data-testid="schedule-form-error"]').should('be.visible').and('contain', 'conflita')
    expectClinicPath('/schedules/new')
  })

  it('shows professional not found error on 404 response', () => {
    cy.intercept('POST', `${Cypress.env('API_URL')}/schedules`, {
      statusCode: 404,
      body: { status: 404, title: 'Not Found', detail: 'Professional not found' },
    }).as('createSchedule')

    visitClinic('/schedules/new', mockProfessionalUser)
    cy.get('[data-testid="schedule-form-day"]').select('TUESDAY')
    cy.get('[data-testid="schedule-form-start-time"]').clear().type('09:00')
    cy.get('[data-testid="schedule-form-end-time"]').clear().type('13:00')
    cy.get('[data-testid="schedule-form-slot"]').type('{selectall}60')
    cy.get('[data-testid="schedule-form-submit"]').click()

    cy.wait('@createSchedule')
    cy.get('[data-testid="schedule-form-error"]').should('be.visible').and('contain', 'Profissional não encontrado')
  })

  it('disables submit button while request is in flight', () => {
    cy.intercept('POST', `${Cypress.env('API_URL')}/schedules`, (req) => {
      req.reply({ delay: 2000, statusCode: 201, body: mockCreatedSchedule })
    }).as('createSchedule')

    visitClinic('/schedules/new', mockProfessionalUser)
    cy.get('[data-testid="schedule-form-day"]').select('TUESDAY')
    cy.get('[data-testid="schedule-form-start-time"]').clear().type('09:00')
    cy.get('[data-testid="schedule-form-end-time"]').clear().type('13:00')
    cy.get('[data-testid="schedule-form-slot"]').type('{selectall}60')
    cy.get('[data-testid="schedule-form-submit"]').click()

    cy.get('[data-testid="schedule-form-submit"]').should('be.disabled')
    cy.wait('@createSchedule')
  })

  it('back button returns to /schedules without creating', () => {
    visitClinic('/schedules/new', mockProfessionalUser)
    cy.get('[data-testid="new-schedule-back-button"]').click()
    expectClinicPath('/schedules')
  })
})

export {}
