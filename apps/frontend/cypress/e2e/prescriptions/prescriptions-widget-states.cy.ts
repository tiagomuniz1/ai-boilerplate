// Mocked — estados de loading/erro/vazio e diálogos do widget de receitas
// dentro da consulta nunca tinham teste algum (só o happy path real).

import { visitClinic } from '../../support/clinic'

const PROFESSIONAL_UUID = '00000000-0000-4000-b000-000000000001'
const APPT_UUID = '00000000-0000-4000-c000-000000000002'
const SPEC_UUID = '00000000-0000-4000-d000-000000000001'
const RX_UUID = '00000000-0000-4000-e000-000000000001'

const mockProfessionalUser = {
  id: 'professional-user-uuid',
  fullName: 'Dr. João',
  email: 'professional@pulso.center',
  role: 'professional',
  clinicId: '10000000-0000-4000-8000-000000000000',
}

const mockAppointment = {
  id: APPT_UUID,
  professionalId: PROFESSIONAL_UUID,
  professionalName: 'Dr. João',
  patientId: 'patient-uuid',
  patientName: 'Ana Lima',
  specialtyId: SPEC_UUID,
  specialtyName: 'Cardiologia',
  scheduleId: 'sched-uuid',
  date: '2099-12-01',
  startTime: '09:00',
  endTime: '09:30',
  status: 'scheduled',
  reason: null,
  cancellationReason: null,
  createdAt: new Date().toISOString(),
  updatedAt: new Date().toISOString(),
  patient: {
    fullName: 'Ana Lima',
    email: 'ana@test.com',
    phoneNumber: '11999990001',
    birthDate: '1990-01-01',
    documentNumber: '12345678901',
    gender: 'female',
  },
}

const mockPrescription = {
  id: RX_UUID,
  appointmentId: APPT_UUID,
  items: [{ medicationId: null, name: 'Dipirona', activeIngredient: 'Dipirona', dosage: null, quantity: null, instructions: '1x ao dia' }],
  notes: null,
  issuedAt: new Date().toISOString(),
  patientName: 'Ana Lima',
  professionalName: 'Dr. João',
}

describe('Prescriptions — widget states (mocked)', () => {
  beforeEach(() => {
    cy.clearCookies()
    cy.clearLocalStorage()
    // Registered first on purpose: any spec-specific intercept below overrides
    // it, and the widgets this spec does not care about stop 401-ing the app
    // into a login/dashboard redirect loop.
    cy.stubAppointmentDetailWidgets()
    cy.intercept('GET', `${Cypress.env('API_URL')}/professionals*`, {
      statusCode: 200,
      body: {
        data: [{
          id: PROFESSIONAL_UUID,
          user: { id: 'professional-user-uuid', fullName: 'Dr. João', email: 'professional@pulso.center', isActive: true },
          registrations: [{ id: 'reg-1', councilType: 'crm', number: '12345/SP', state: 'SP', isPrimary: true }],
          specialties: [{ id: SPEC_UUID, name: 'Cardiologia' }],
          bio: null,
          createdAt: new Date().toISOString(),
          updatedAt: new Date().toISOString(),
        }],
        total: 1,
        page: 1,
        limit: 200,
      },
    })
    // Mesma armadilha de glob: `/professionals/me` é a ficha do próprio usuário,
    // e é ela que decide se o botão de emitir aparece. Este spec roda como o
    // profissional dono da consulta.
    cy.intercept('GET', `${Cypress.env('API_URL')}/professionals/me`, {
      statusCode: 200,
      body: {
        id: PROFESSIONAL_UUID,
        user: { id: 'professional-user-uuid', fullName: 'Dr. João', email: 'professional@pulso.center', isActive: true },
        registrations: [{ id: 'reg-1', councilType: 'crm', number: '12345/SP', state: 'SP', isPrimary: true }],
        specialties: [{ id: SPEC_UUID, name: 'Cardiologia' }],
        bio: null,
        createdAt: new Date().toISOString(),
        updatedAt: new Date().toISOString(),
      },
    })
    // ProfessionalSignatureSelect always fetches GET /professionals/:id (even when it
    // renders nothing) — the blanket `/professionals*` intercept above only matches the
    // query-string form (`/professionals?...`), not this nested path, so it needs its own.
    cy.intercept('GET', `${Cypress.env('API_URL')}/professionals/${PROFESSIONAL_UUID}`, {
      statusCode: 200,
      body: {
        id: PROFESSIONAL_UUID,
        user: { id: 'professional-user-uuid', fullName: 'Dr. João', email: 'professional@pulso.center', isActive: true },
        registrations: [{ id: 'reg-1', councilType: 'crm', number: '12345/SP', state: 'SP', isPrimary: true }],
        specialties: [{ id: SPEC_UUID, name: 'Cardiologia' }],
        bio: null,
        createdAt: new Date().toISOString(),
        updatedAt: new Date().toISOString(),
      },
    })
    cy.intercept('GET', `${Cypress.env('API_URL')}/appointments/${APPT_UUID}`, {
      statusCode: 200,
      body: mockAppointment,
    }).as('getAppointment')
    cy.intercept('GET', `${Cypress.env('API_URL')}/medical-records/by-appointment/${APPT_UUID}`, {
      statusCode: 200,
      body: null,
    })
    cy.intercept('GET', `${Cypress.env('API_URL')}/medical-record-templates*`, {
      statusCode: 200,
      body: { data: [], total: 0, page: 1, limit: 1 },
    })
    cy.intercept('GET', `${Cypress.env('API_URL')}/medical-certificates*`, {
      statusCode: 200,
      body: [],
    })
    cy.intercept('GET', `${Cypress.env('API_URL')}/exam-requests*`, {
      statusCode: 200,
      body: [],
    })
    cy.intercept('GET', `${Cypress.env('API_URL')}/prescription-templates*`, {
      statusCode: 200,
      body: [],
    })
    cy.intercept('GET', `${Cypress.env('API_URL')}/medications*`, {
      statusCode: 200,
      body: { data: [], total: 0, page: 1, limit: 10 },
    })
  })

  it('shows a skeleton while loading, then an error state on failure', () => {
    cy.intercept('GET', `${Cypress.env('API_URL')}/prescriptions*`, {
      statusCode: 200,
      body: [],
      delay: 500,
    }).as('getPrescriptionsSlow')

    visitClinic(`/appointments/${APPT_UUID}`, mockProfessionalUser)
    cy.wait('@getAppointment')
    cy.get('[data-testid="tab-receitas"]').click()
    cy.get('[data-testid="prescription-list-skeleton"]').should('be.visible')
    cy.wait('@getPrescriptionsSlow')
    cy.get('[data-testid="prescription-list-skeleton"]').should('not.exist')

    cy.intercept('GET', `${Cypress.env('API_URL')}/prescriptions*`, {
      statusCode: 500,
      body: { type: 'https://httpstatuses.com/500', title: 'INTERNAL_SERVER_ERROR', status: 500, detail: 'Internal error' },
    }).as('getPrescriptionsError')
    cy.reload()
    cy.wait('@getAppointment')
    cy.get('[data-testid="tab-receitas"]').click()
    cy.wait('@getPrescriptionsError')
    cy.get('[data-testid="prescription-section-error"]').should('be.visible')
  })

  it('cancels and confirms deleting an existing prescription', () => {
    cy.intercept('GET', `${Cypress.env('API_URL')}/prescriptions*`, {
      statusCode: 200,
      body: [mockPrescription],
    }).as('getPrescriptions')

    visitClinic(`/appointments/${APPT_UUID}`, mockProfessionalUser)
    cy.wait('@getAppointment')
    cy.get('[data-testid="tab-receitas"]').click()
    cy.wait('@getPrescriptions')

    cy.get(`[data-testid="prescription-delete-button-${RX_UUID}"]`).click()
    cy.get('[data-testid="prescription-delete-dialog"]').should('be.visible')
    cy.get('[data-testid="prescription-delete-dialog-message"]').should('be.visible')
    cy.get('[data-testid="prescription-delete-dialog-cancel"]').click()
    cy.get('[data-testid="prescription-delete-dialog"]').should('not.exist')
    cy.get(`[data-testid="prescription-item-${RX_UUID}"]`).should('exist')

    cy.intercept('DELETE', `${Cypress.env('API_URL')}/prescriptions/${RX_UUID}`, { statusCode: 204 }).as('deleteRx')
    cy.intercept('GET', `${Cypress.env('API_URL')}/prescriptions*`, {
      statusCode: 200,
      body: [],
    }).as('getPrescriptionsAfterDelete')

    cy.get(`[data-testid="prescription-delete-button-${RX_UUID}"]`).click()
    cy.get('[data-testid="prescription-delete-dialog-confirm"]').click()
    cy.wait('@deleteRx')
    cy.wait('@getPrescriptionsAfterDelete')
    cy.get('[data-testid="prescription-delete-dialog"]').should('not.exist')
    cy.get('[data-testid="prescription-section-empty"]').should('be.visible')
  })

  it('shows a validation error when submitting with no items, and a "no results" search state', () => {
    cy.intercept('GET', `${Cypress.env('API_URL')}/prescriptions*`, {
      statusCode: 200,
      body: [],
    }).as('getPrescriptions')

    visitClinic(`/appointments/${APPT_UUID}`, mockProfessionalUser)
    cy.wait('@getAppointment')
    cy.get('[data-testid="tab-receitas"]').click()
    cy.wait('@getPrescriptions')

    cy.get('[data-testid="prescription-new-button"]').click()
    cy.get('[data-testid="prescription-form"]').should('be.visible')
    cy.get('[data-testid="prescription-form-search"]').type('MedicamentoInexistente')
    cy.get('[data-testid="prescription-form-no-results"]', { timeout: 10000 }).should('be.visible')

    cy.get('[data-testid="prescription-form-submit"]').click()
    cy.get('[data-testid="prescription-form-items-error"]').should('be.visible').and('contain.text', 'Adicione ao menos um medicamento')
  })

  it('shows a generic error when the API fails to create the prescription', () => {
    cy.intercept('GET', `${Cypress.env('API_URL')}/prescriptions*`, {
      statusCode: 200,
      body: [],
    }).as('getPrescriptions')

    visitClinic(`/appointments/${APPT_UUID}`, mockProfessionalUser)
    cy.wait('@getAppointment')
    cy.get('[data-testid="tab-receitas"]').click()
    cy.wait('@getPrescriptions')

    cy.get('[data-testid="prescription-new-button"]').click()
    cy.get('[data-testid="prescription-form-tab-ingredient"]').click()
    cy.get('[data-testid="prescription-form-manual-input"]').type('Paracetamol')
    cy.get('[data-testid="prescription-form-manual-add"]').click()
    cy.get('[data-testid="prescription-form-item-instructions-0"]').type('1 comprimido se dor')

    cy.intercept('POST', `${Cypress.env('API_URL')}/prescriptions`, {
      statusCode: 500,
      body: { type: 'https://httpstatuses.com/500', title: 'INTERNAL_SERVER_ERROR', status: 500, detail: 'Internal error' },
    }).as('createRxError')

    cy.get('[data-testid="prescription-form-submit"]').click()
    cy.wait('@createRxError')
    cy.get('[data-testid="prescription-form-error"]').should('be.visible')
    cy.get('[data-testid="prescription-form-modal"]').should('be.visible')
  })

  it('opens and cancels the "save as template" modal', () => {
    cy.intercept('GET', `${Cypress.env('API_URL')}/prescriptions*`, {
      statusCode: 200,
      body: [],
    }).as('getPrescriptions')

    visitClinic(`/appointments/${APPT_UUID}`, mockProfessionalUser)
    cy.wait('@getAppointment')
    cy.get('[data-testid="tab-receitas"]').click()
    cy.wait('@getPrescriptions')

    cy.get('[data-testid="prescription-new-button"]').click()
    cy.get('[data-testid="prescription-form-tab-ingredient"]').click()
    cy.get('[data-testid="prescription-form-manual-input"]').type('Paracetamol')
    cy.get('[data-testid="prescription-form-manual-add"]').click()
    cy.get('[data-testid="prescription-form-item-instructions-0"]').type('1 comprimido se dor')

    cy.get('[data-testid="prescription-form-save-template-button"]').click()
    cy.get('[data-testid="prescription-form-save-template-modal"]').should('be.visible')
    cy.get('[data-testid="prescription-form-save-template-cancel"]').click()
    cy.get('[data-testid="prescription-form-save-template-modal"]').should('not.exist')
    cy.get('[data-testid="prescription-form"]').should('be.visible')
  })
})
