// Series affordances on the appointment detail page: the "session N of M" badge,
// the series dialog, and the cancellation scope choice.

import { visitClinic } from '../../support/clinic'

const DOC_UUID = '00000000-0000-4000-b000-000000000001'
const APPT_UUID = '00000000-0000-4000-d000-000000000001'
const SERIES_UUID = '00000000-0000-4000-c000-000000000001'

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

const makeAppointment = (overrides: Record<string, unknown> = {}) => ({
  id: APPT_UUID,
  professionalId: DOC_UUID,
  professionalName: 'Dr. Test',
  patientId: 'patient-uuid',
  patientName: 'Patient One',
  scheduleId: 'sched-uuid',
  specialtyId: null,
  specialtyName: null,
  date: '2025-06-10',
  startTime: '09:00',
  endTime: '09:30',
  status: 'scheduled',
  insuranceType: null,
  reason: 'Fisioterapia',
  cancellationReason: null,
  seriesId: null,
  seriesSequence: null,
  seriesTotalOccurrences: null,
  seriesFutureCount: null,
  createdAt: '2025-06-01T10:00:00.000Z',
  updatedAt: '2025-06-01T10:00:00.000Z',
  patient: {
    fullName: 'Patient One',
    email: 'patient@test.com',
    phoneNumber: '11999990001',
    birthDate: '1990-01-01',
    documentNumber: '12345678901',
    gender: 'male',
  },
  ...overrides,
})

const seriesAppointment = makeAppointment({
  seriesId: SERIES_UUID,
  seriesSequence: 2,
  seriesTotalOccurrences: 4,
  seriesFutureCount: 2,
})

const makeOccurrence = (id: string, date: string, sequence: number, status = 'scheduled') => ({
  id,
  professionalId: DOC_UUID,
  professionalName: 'Dr. Test',
  patientId: 'patient-uuid',
  patientName: 'Patient One',
  specialtyId: null,
  specialtyName: null,
  scheduleId: 'sched-uuid',
  date,
  startTime: '09:00',
  endTime: '09:30',
  status,
  insuranceType: null,
  reason: null,
  cancellationReason: null,
  seriesId: SERIES_UUID,
  seriesSequence: sequence,
  seriesTotalOccurrences: 4,
  createdAt: '2025-06-01T10:00:00.000Z',
  updatedAt: '2025-06-01T10:00:00.000Z',
})

const mockSeries = {
  id: SERIES_UUID,
  professionalId: DOC_UUID,
  professionalName: 'Dr. Test',
  patientId: 'patient-uuid',
  patientName: 'Patient One',
  specialtyId: null,
  specialtyName: null,
  recurrenceInterval: 'every_week',
  dayOfWeek: 'TUESDAY',
  startTime: '09:00',
  anchorDate: '2025-06-03',
  requestedOccurrenceCount: 4,
  requestedUntilDate: null,
  createdOccurrenceCount: 4,
  createdAt: '2025-06-01T10:00:00.000Z',
  occurrences: [
    makeOccurrence('apt-1', '2025-06-03', 1, 'completed'),
    makeOccurrence('apt-2', '2025-06-10', 2),
    makeOccurrence('apt-3', '2025-06-17', 3),
    makeOccurrence('apt-4', '2025-06-24', 4),
  ],
}

function stubDetailPage(appointment: Record<string, unknown>) {
  // Sem ficha de profissional: o default para quem só administra ou recepciona.
  // O glob `/professionals*` não cobre esta rota — `*` não atravessa a barra.
  cy.intercept('GET', `${Cypress.env('API_URL')}/professionals/me`, { statusCode: 200, body: null })
  cy.intercept('GET', `${Cypress.env('API_URL')}/professionals*`, { statusCode: 200, body: mockProfessionalsList })
  cy.intercept('GET', `${Cypress.env('API_URL')}/appointments/${APPT_UUID}`, {
    statusCode: 200,
    body: appointment,
  }).as('getAppointment')
  cy.intercept('GET', `${Cypress.env('API_URL')}/medical-records/by-appointment/${APPT_UUID}`, {
    statusCode: 200,
    body: null,
  })
  cy.intercept('GET', `${Cypress.env('API_URL')}/medical-record-templates*`, {
    statusCode: 200,
    body: { data: [], total: 0, page: 1, limit: 1 },
  })
  cy.intercept('GET', `${Cypress.env('API_URL')}/prescriptions*`, {
    statusCode: 200,
    body: { data: [], total: 0, page: 1, limit: 20 },
  })
  cy.intercept('GET', `${Cypress.env('API_URL')}/medical-certificates*`, { statusCode: 200, body: [] })
  cy.intercept('GET', `${Cypress.env('API_URL')}/exam-requests*`, { statusCode: 200, body: [] })
  // The detail page mounts the photos tab; unstubbed it 401s and the api-client
  // redirect interceptor puts the app in a login/dashboard redirect loop.
  cy.intercept('GET', `${Cypress.env('API_URL')}/consultation-photos*`, { statusCode: 200, body: [] })
}

describe('Appointments — recurring series affordances', () => {
  beforeEach(() => {
    cy.clearCookies()
    cy.clearLocalStorage()
  })

  describe('series indicator and dialog', () => {
    it('shows the session position and opens the series dialog', () => {
      stubDetailPage(seriesAppointment)
      cy.intercept('GET', `${Cypress.env('API_URL')}/appointments/series/${SERIES_UUID}`, {
        statusCode: 200,
        body: mockSeries,
      }).as('getSeries')

      visitClinic(`/appointments/${APPT_UUID}`, mockProfessionalUser)

      cy.get('[data-testid="appointment-detail-series"]').should('contain.text', 'Sessão 2 de 4')
      cy.get('[data-testid="appointment-detail-view-series-button"]').click()

      cy.wait('@getSeries')
      cy.get('[data-testid="series-dialog"]').should('be.visible')
      cy.get('[data-testid="series-dialog-summary"]').should('contain.text', '09:00')
      cy.get('[data-testid="series-dialog-list"]').find('li').should('have.length', 4)
      cy.get('[data-testid="series-dialog-status-2025-06-03"]').should('contain.text', 'Concluída')
    })

    it('navigates to another occurrence from the series dialog', () => {
      stubDetailPage(seriesAppointment)
      cy.intercept('GET', `${Cypress.env('API_URL')}/appointments/series/${SERIES_UUID}`, {
        statusCode: 200,
        body: mockSeries,
      }).as('getSeries')
      cy.intercept('GET', `${Cypress.env('API_URL')}/appointments/apt-3`, {
        statusCode: 200,
        body: makeAppointment({ id: 'apt-3', seriesId: SERIES_UUID, seriesSequence: 3, seriesTotalOccurrences: 4 }),
      })

      visitClinic(`/appointments/${APPT_UUID}`, mockProfessionalUser)
      cy.get('[data-testid="appointment-detail-view-series-button"]').click()
      cy.wait('@getSeries')
      cy.get('[data-testid="series-dialog-item-2025-06-17"]').click()

      cy.location('pathname').should('include', '/appointments/apt-3')
    })

    it('shows the error state when the series cannot be loaded', () => {
      stubDetailPage(seriesAppointment)
      cy.intercept('GET', `${Cypress.env('API_URL')}/appointments/series/${SERIES_UUID}`, {
        statusCode: 500,
        body: { title: 'Internal Server Error' },
      }).as('getSeriesFail')

      visitClinic(`/appointments/${APPT_UUID}`, mockProfessionalUser)
      cy.get('[data-testid="appointment-detail-view-series-button"]').click()

      cy.wait('@getSeriesFail')
      cy.get('[data-testid="series-dialog-error"]').should('be.visible')
    })

    it('omits the series block for a standalone appointment', () => {
      stubDetailPage(makeAppointment())

      visitClinic(`/appointments/${APPT_UUID}`, mockProfessionalUser)

      cy.get('[data-testid="appointment-detail-series"]').should('not.exist')
      cy.get('[data-testid="appointment-detail-view-series-button"]').should('not.exist')
    })
  })

  describe('cancellation scope', () => {
    it('does not offer a scope choice for a standalone appointment', () => {
      stubDetailPage(makeAppointment())

      visitClinic(`/appointments/${APPT_UUID}`, mockProfessionalUser)
      cy.get('[data-testid="appointment-detail-cancel-button"]').click()

      cy.get('[data-testid="cancel-appointment-dialog"]').should('be.visible')
      cy.get('[data-testid="cancel-dialog-scope"]').should('not.exist')
    })

    it('does not offer a scope choice on the last occurrence of a series', () => {
      stubDetailPage(
        makeAppointment({
          seriesId: SERIES_UUID,
          seriesSequence: 4,
          seriesTotalOccurrences: 4,
          seriesFutureCount: 0,
        }),
      )

      visitClinic(`/appointments/${APPT_UUID}`, mockProfessionalUser)
      cy.get('[data-testid="appointment-detail-cancel-button"]').click()

      cy.get('[data-testid="cancel-dialog-scope"]').should('not.exist')
    })

    it('cancels only this occurrence by default', () => {
      stubDetailPage(seriesAppointment)
      cy.intercept('PATCH', `${Cypress.env('API_URL')}/appointments/${APPT_UUID}/cancel`, {
        statusCode: 200,
        body: { ...seriesAppointment, status: 'cancelled', cancelledOccurrenceCount: 1, cancelledAppointmentIds: [APPT_UUID] },
      }).as('cancel')

      visitClinic(`/appointments/${APPT_UUID}`, mockProfessionalUser)
      cy.get('[data-testid="appointment-detail-cancel-button"]').click()

      cy.get('[data-testid="cancel-dialog-scope-occurrence"]').should('be.checked')
      cy.get('[data-testid="cancel-dialog-confirm"]').should('contain.text', 'Cancelar consulta').click()

      cy.wait('@cancel').its('request.body').should('deep.include', { scope: 'single_occurrence' })
    })

    it('cancels this and every future occurrence, counting them in the copy', () => {
      stubDetailPage(seriesAppointment)
      cy.intercept('PATCH', `${Cypress.env('API_URL')}/appointments/${APPT_UUID}/cancel`, {
        statusCode: 200,
        body: {
          ...seriesAppointment,
          status: 'cancelled',
          cancelledOccurrenceCount: 3,
          cancelledAppointmentIds: [APPT_UUID, 'apt-3', 'apt-4'],
        },
      }).as('cancelSeries')

      visitClinic(`/appointments/${APPT_UUID}`, mockProfessionalUser)
      cy.get('[data-testid="appointment-detail-cancel-button"]').click()
      cy.get('[data-testid="cancel-dialog-scope-series"]').check()

      cy.get('[data-testid="cancel-dialog-scope-summary"]').should('contain.text', 'Serão canceladas 3 consultas')
      cy.get('[data-testid="cancel-dialog-confirm"]').should('contain.text', 'Cancelar 3 consultas').click()

      cy.wait('@cancelSeries').its('request.body').should('deep.include', {
        scope: 'this_and_future_occurrences',
      })
    })

    it('resets the scope to this occurrence when the dialog is reopened', () => {
      stubDetailPage(seriesAppointment)

      visitClinic(`/appointments/${APPT_UUID}`, mockProfessionalUser)
      cy.get('[data-testid="appointment-detail-cancel-button"]').click()
      cy.get('[data-testid="cancel-dialog-scope-series"]').check().should('be.checked')
      cy.get('[data-testid="cancel-dialog-cancel"]').click()

      cy.get('[data-testid="appointment-detail-cancel-button"]').click()

      cy.get('[data-testid="cancel-dialog-scope-occurrence"]').should('be.checked')
    })
  })
})
