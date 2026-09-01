// Mocked counterpart of appointments-recurrence-real.cy.ts: covers the states the
// real backend cannot be forced into on demand (preview failure, empty result,
// submit conflict) plus the client-side validation of the recurrence rule.

import { visitClinic } from '../../support/clinic'

const DOC_UUID = '00000000-0000-4000-b000-000000000001'
const PATIENT_UUID = '00000000-0000-4000-e000-000000000001'
const SPEC_UUID = '00000000-0000-4000-d000-000000000001'

const mockProfessionalUser = {
  id: 'professional-user-uuid',
  fullName: 'Dr. Test',
  email: 'professional@pulso.center',
  role: 'professional',
  clinicId: '10000000-0000-4000-8000-000000000000',
}

const makeProfessional = (specialties: { id: string; name: string }[]) => ({
  id: DOC_UUID,
  user: { id: 'professional-user-uuid', fullName: 'Dr. Test', email: 'professional@pulso.center', isActive: true },
  registrations: [{ id: 'reg-1', councilType: 'crm', number: '12345/SP', state: 'SP', isPrimary: true }],
  specialties,
  bio: null,
  createdAt: '2025-01-01T10:00:00.000Z',
  updatedAt: '2025-01-01T10:00:00.000Z',
})

const mockPatientsList = {
  data: [
    {
      id: PATIENT_UUID,
      user: { id: 'patient-user-uuid', fullName: 'Patient One', email: 'patient@test.com', isActive: true },
      fullName: 'Patient One',
      phoneNumber: '11999999999',
      birthDate: '1990-01-01',
      documentNumber: '12345678901',
      gender: 'male',
      createdAt: '2025-01-01T10:00:00.000Z',
      updatedAt: '2025-01-01T10:00:00.000Z',
    },
  ],
  total: 1,
  page: 1,
  limit: 200,
}

function addWeeks(date: string, weeks: number): string {
  const result = new Date(`${date}T00:00:00Z`)
  result.setUTCDate(result.getUTCDate() + weeks * 7)
  return result.toISOString().slice(0, 10)
}

const makeOccurrence = (date: string, availability: string) => ({
  date,
  startTime: '09:00',
  endTime: availability === 'available' ? '09:30' : null,
  scheduleId: availability === 'available' ? 'sched-uuid' : null,
  availability,
  selectable: availability === 'available',
})

/**
 * The slot the agenda offers is picked at runtime, so the preview is derived from
 * the date the app actually asked for and recorded here for the assertions —
 * hardcoding dates would drift with the calendar.
 */
let seriesDates: string[] = []

function stubPreview(alias: string, options: { body?: Record<string, unknown>; delay?: number } = {}) {
  cy.intercept('GET', `${Cypress.env('API_URL')}/appointments/recurring/preview*`, (req) => {
    const anchor = new URL(req.url).searchParams.get('date') as string
    seriesDates = [anchor, addWeeks(anchor, 1), addWeeks(anchor, 2)]

    req.reply({
      statusCode: 200,
      delay: options.delay,
      body: {
        professionalId: DOC_UUID,
        patientId: PATIENT_UUID,
        recurrenceInterval: 'every_week',
        dayOfWeek: 'FRIDAY',
        startTime: '09:00',
        occurrences: [
          makeOccurrence(seriesDates[0], 'available'),
          makeOccurrence(seriesDates[1], 'already_booked'),
          makeOccurrence(seriesDates[2], 'available'),
        ],
        availableOccurrenceCount: 2,
        unavailableOccurrenceCount: 1,
        truncatedByMaximumOccurrences: false,
        truncatedByHorizon: false,
        ...options.body,
      },
    })
  }).as(alias)
}

describe('Appointments — recurring series (mocked)', () => {
  beforeEach(() => {
    cy.clearCookies()
    cy.clearLocalStorage()
    seriesDates = []

    // Sem ficha de profissional: o default para quem só administra ou recepciona.
    // O glob `/professionals*` não cobre esta rota — `*` não atravessa a barra.
    cy.intercept('GET', `${Cypress.env('API_URL')}/professionals/me`, { statusCode: 200, body: null })
    cy.intercept('GET', `${Cypress.env('API_URL')}/professionals*`, {
      statusCode: 200,
      body: { data: [makeProfessional([{ id: SPEC_UUID, name: 'Cardiologia' }])], total: 1, page: 1, limit: 200 },
    })
    cy.intercept('GET', `${Cypress.env('API_URL')}/professionals/${DOC_UUID}`, {
      statusCode: 200,
      body: makeProfessional([{ id: SPEC_UUID, name: 'Cardiologia' }]),
    })
    cy.intercept('GET', `${Cypress.env('API_URL')}/appointments/availability*`, (req) => {
      req.reply({
        statusCode: 200,
        body: {
          professionalId: DOC_UUID,
          date: new URL(req.url).searchParams.get('date'),
          slots: [{ startTime: '09:00', endTime: '09:30', scheduleId: 'sched-uuid', slotDurationInMinutes: 30 }],
        },
      })
    })
    cy.intercept('GET', `${Cypress.env('API_URL')}/appointments*`, {
      statusCode: 200,
      body: { data: [], total: 0, page: 1, limit: 100 },
    })
    cy.intercept('GET', `${Cypress.env('API_URL')}/patients*`, { statusCode: 200, body: mockPatientsList })
    cy.intercept('GET', `${Cypress.env('API_URL')}/schedule-exceptions*`, {
      statusCode: 200,
      body: { data: [], total: 0, page: 1, limit: 20 },
    })

    visitClinic('/appointments', mockProfessionalUser)
    // Two weeks forward so every occurrence of the series is in the future.
    cy.get('[data-testid="toolbar-next"]', { timeout: 10000 }).click()
    cy.get('[data-testid="toolbar-next"]').click()
  })

  function openDialogAndEnableRecurrence() {
    cy.get('[data-testid="agenda-slot-free"]:not([disabled])', { timeout: 10000 }).first().click()
    cy.get('[data-testid="book-appointment-dialog"]').should('be.visible')
    cy.get('[data-testid="book-dialog-patient"]').select(PATIENT_UUID)
    cy.get('[data-testid="book-dialog-recurrence-toggle"]').check()
  }

  it('reveals the recurrence fields and relabels the submit button', () => {
    cy.get('[data-testid="agenda-slot-free"]:not([disabled])', { timeout: 10000 }).first().click()

    cy.get('[data-testid="book-dialog-recurrence-fields"]').should('not.exist')
    cy.get('[data-testid="book-dialog-submit"]').should('contain.text', 'Agendar')

    cy.get('[data-testid="book-dialog-recurrence-toggle"]').check()

    cy.get('[data-testid="book-dialog-recurrence-fields"]').should('be.visible')
    cy.get('[data-testid="book-dialog-recurrence-summary"]').should('contain.text', '09:00')
    cy.get('[data-testid="book-dialog-submit"]').should('contain.text', 'Revisar datas')
  })

  it('requires an occurrence count', () => {
    openDialogAndEnableRecurrence()
    cy.get('[data-testid="book-dialog-recurrence-occurrences"]').clear()
    cy.get('[data-testid="book-dialog-submit"]').click()

    cy.get('[data-testid="book-dialog-recurrence-occurrences-error"]').should('be.visible')
  })

  it('requires an end date when that mode is chosen', () => {
    openDialogAndEnableRecurrence()
    cy.get('[data-testid="book-dialog-recurrence-end-date"]').check()
    cy.get('[data-testid="book-dialog-submit"]').click()

    cy.get('[data-testid="book-dialog-recurrence-until-error"]').should('be.visible')
  })

  it('shows the loading state and then the preview list', () => {
    stubPreview('preview', { delay: 500 })

    openDialogAndEnableRecurrence()
    cy.get('[data-testid="book-dialog-submit"]').click()

    cy.get('[data-testid="recurrence-preview-loading"]').should('be.visible')
    cy.wait('@preview')
    cy.get('[data-testid="recurrence-preview-list"]').should('be.visible')
  })

  it('labels each occurrence status and disables the ones that cannot be booked', () => {
    stubPreview('preview')

    openDialogAndEnableRecurrence()
    cy.get('[data-testid="book-dialog-submit"]').click()
    cy.wait('@preview')

    cy.get('[data-testid="recurrence-preview-list"]').should('be.visible')
    cy.then(() => {
      cy.get(`[data-testid="recurrence-preview-status-${seriesDates[0]}"]`).should('contain.text', 'Disponível')
      cy.get(`[data-testid="recurrence-preview-status-${seriesDates[1]}"]`).should('contain.text', 'Ocupado')
      cy.get(`[data-testid="recurrence-preview-checkbox-${seriesDates[1]}"]`)
        .should('be.disabled')
        .should('not.be.checked')
      cy.get(`[data-testid="recurrence-preview-checkbox-${seriesDates[0]}"]`).should('be.checked')
    })
    cy.get('[data-testid="recurrence-preview-selected-count"]').should('contain.text', '2 datas')
  })

  it('updates the counter when a date is unticked and clears it with toggle-all', () => {
    stubPreview('preview')

    openDialogAndEnableRecurrence()
    cy.get('[data-testid="book-dialog-submit"]').click()
    cy.wait('@preview')
    cy.get('[data-testid="recurrence-preview-list"]').should('be.visible')

    cy.then(() => {
      cy.get(`[data-testid="recurrence-preview-checkbox-${seriesDates[2]}"]`).uncheck()
    })
    cy.get('[data-testid="recurrence-preview-selected-count"]').should('contain.text', '1 datas')
    cy.get('[data-testid="book-dialog-recurrence-confirm"]').should('contain.text', 'Agendar 1 consultas')

    // With a partial selection the button offers to select all, not to clear.
    cy.get('[data-testid="recurrence-preview-toggle-all"]')
      .should('contain.text', 'Marcar todas')
      .click()
    cy.get('[data-testid="recurrence-preview-selected-count"]').should('contain.text', '2 datas')

    cy.get('[data-testid="recurrence-preview-toggle-all"]')
      .should('contain.text', 'Desmarcar todas')
      .click()
    cy.get('[data-testid="book-dialog-recurrence-confirm"]').should('be.disabled')
  })

  it('shows the empty state when the rule generates no date', () => {
    stubPreview('preview', {
      body: { occurrences: [], availableOccurrenceCount: 0, unavailableOccurrenceCount: 0 },
    })

    openDialogAndEnableRecurrence()
    cy.get('[data-testid="book-dialog-submit"]').click()
    cy.wait('@preview')

    cy.get('[data-testid="recurrence-preview-empty"]').should('be.visible')
    cy.get('[data-testid="book-dialog-recurrence-confirm"]').should('not.exist')
  })

  it('shows the preview error and recovers on retry', () => {
    cy.intercept('GET', `${Cypress.env('API_URL')}/appointments/recurring/preview*`, {
      statusCode: 500,
      body: { title: 'Internal Server Error' },
    }).as('previewFail')

    openDialogAndEnableRecurrence()
    cy.get('[data-testid="book-dialog-submit"]').click()
    cy.wait('@previewFail')

    cy.get('[data-testid="recurrence-preview-error"]').should('be.visible')

    stubPreview('previewOk')
    cy.get('[data-testid="recurrence-preview-retry"]').click()
    cy.wait('@previewOk')

    cy.get('[data-testid="recurrence-preview-list"]').should('be.visible')
  })

  it('submits exactly the ticked dates and closes the dialog', () => {
    stubPreview('preview')
    cy.intercept('POST', `${Cypress.env('API_URL')}/appointments/recurring`, {
      statusCode: 201,
      body: {
        seriesId: 'series-uuid',
        recurrenceInterval: 'every_week',
        dayOfWeek: 'FRIDAY',
        startTime: '09:00',
        createdOccurrenceCount: 2,
        appointments: [],
      },
    }).as('bookRecurring')

    openDialogAndEnableRecurrence()
    cy.get('[data-testid="book-dialog-submit"]').click()
    cy.wait('@preview')
    cy.get('[data-testid="book-dialog-recurrence-confirm"]').click()

    cy.wait('@bookRecurring').its('request.body').then((body) => {
      expect(body.dates).to.deep.equal([seriesDates[0], seriesDates[2]])
      expect(body.recurrenceInterval).to.equal('every_week')
      expect(body.patientId).to.equal(PATIENT_UUID)
    })
    cy.get('[data-testid="book-appointment-dialog"]').should('not.exist')
  })

  it('stays on the preview listing the dates that stopped being available', () => {
    stubPreview('preview')

    openDialogAndEnableRecurrence()
    cy.get('[data-testid="book-dialog-submit"]').click()
    cy.wait('@preview')

    cy.then(() => {
      cy.intercept('POST', `${Cypress.env('API_URL')}/appointments/recurring`, {
        statusCode: 409,
        body: {
          title: 'Conflict',
          detail: 'Some of the requested dates are no longer available',
          conflictingOccurrences: [{ date: seriesDates[2], availability: 'already_booked' }],
        },
      }).as('bookConflict')
    })
    cy.get('[data-testid="book-dialog-recurrence-confirm"]').click()
    cy.wait('@bookConflict')

    cy.get('[data-testid="recurrence-submit-error"]').should('contain.text', 'deixaram de estar disponíveis')
    cy.get('[data-testid="book-dialog-recurrence-step"]').should('be.visible')
    cy.get('[data-testid="book-appointment-dialog"]').should('be.visible')
  })

  it('goes back to the form keeping the values that were filled in', () => {
    stubPreview('preview')

    openDialogAndEnableRecurrence()
    cy.get('[data-testid="book-dialog-recurrence-interval"]').select('every_two_weeks')
    cy.get('[data-testid="book-dialog-submit"]').click()
    cy.wait('@preview')

    cy.get('[data-testid="book-dialog-recurrence-back"]').click()

    cy.get('[data-testid="book-dialog-patient"]').should('have.value', PATIENT_UUID)
    cy.get('[data-testid="book-dialog-recurrence-interval"]').should('have.value', 'every_two_weeks')
  })

  it('books a single appointment when the recurrence toggle is left off', () => {
    cy.intercept('POST', `${Cypress.env('API_URL')}/appointments`, {
      statusCode: 201,
      body: {
        id: 'new-appt-uuid',
        professionalId: DOC_UUID,
        professionalName: 'Dr. Test',
        patientId: PATIENT_UUID,
        patientName: 'Patient One',
        specialtyId: SPEC_UUID,
        specialtyName: 'Cardiologia',
        scheduleId: 'sched-uuid',
        date: '2099-06-19',
        startTime: '09:00',
        endTime: '09:30',
        status: 'scheduled',
        insuranceType: null,
        reason: null,
        cancellationReason: null,
        seriesId: null,
        seriesSequence: null,
        seriesTotalOccurrences: null,
        createdAt: '2025-07-01T10:00:00.000Z',
        updatedAt: '2025-07-01T10:00:00.000Z',
      },
    }).as('book')

    cy.get('[data-testid="agenda-slot-free"]:not([disabled])', { timeout: 10000 }).first().click()
    cy.get('[data-testid="book-dialog-patient"]').select(PATIENT_UUID)
    cy.get('[data-testid="book-dialog-submit"]').click()

    cy.wait('@book')
    cy.get('[data-testid="book-appointment-dialog"]').should('not.exist')
  })
})
