import { visitClinic, expectClinicPath, CLINIC_SLUG, CLINIC_ID } from '../../support/clinic'

const SPEC_ID_1 = '00000000-0000-4000-a000-000000000001'

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

const populatedListResponse = { data: [mockSchedule], total: 1, page: 1, limit: 20 }
const emptyListResponse = { data: [], total: 0, page: 1, limit: 20 }

const mockProfessionalsList = {
  data: [
    {
      id: 'doc-uuid-1',
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

describe('Schedules Delete', () => {
  beforeEach(() => {
    cy.clearCookies()
    cy.clearLocalStorage()
    cy.intercept('GET', `${Cypress.env('API_URL')}/professionals*`, { statusCode: 200, body: mockProfessionalsList })
  })

  describe('from list page', () => {
    beforeEach(() => {
      cy.intercept('GET', `${Cypress.env('API_URL')}/schedules*`, { statusCode: 200, body: populatedListResponse }).as('getSchedules')
    })

    it('opens confirmation dialog when delete button is clicked', () => {
      visitClinic('/schedules', mockProfessionalUser)
      cy.wait('@getSchedules')

      cy.get(`[data-testid="schedule-delete-button-${mockSchedule.id}"]`).click()
      cy.get('[data-testid="delete-schedule-dialog-confirm"]').should('be.visible')
      cy.get('[data-testid="delete-schedule-dialog-cancel"]').should('be.visible')
    })

    it('dialog displays schedule day and time', () => {
      visitClinic('/schedules', mockProfessionalUser)
      cy.wait('@getSchedules')

      cy.get(`[data-testid="schedule-delete-button-${mockSchedule.id}"]`).click()
      cy.get('[data-testid="delete-schedule-dialog-message"]')
        .should('contain', 'Segunda-feira')
        .and('contain', '08:00')
    })

    it('cancels deletion — dialog closes and row remains', () => {
      visitClinic('/schedules', mockProfessionalUser)
      cy.wait('@getSchedules')

      cy.get(`[data-testid="schedule-delete-button-${mockSchedule.id}"]`).click()
      cy.get('[data-testid="delete-schedule-dialog-cancel"]').click()

      cy.get('[data-testid="delete-schedule-dialog-confirm"]').should('not.exist')
      cy.get(`[data-testid="schedule-table-row-${mockSchedule.id}"]`).should('exist')
    })

    it('confirms deletion — calls DELETE and shows success message', () => {
      cy.intercept('DELETE', `${Cypress.env('API_URL')}/schedules/${mockSchedule.id}`, { statusCode: 204 }).as('deleteSchedule')

      visitClinic('/schedules', mockProfessionalUser)
      cy.wait('@getSchedules')

      cy.get(`[data-testid="schedule-delete-button-${mockSchedule.id}"]`).click()

      cy.intercept('GET', `${Cypress.env('API_URL')}/schedules*`, { statusCode: 200, body: emptyListResponse }).as('getSchedulesAfterDelete')
      cy.get('[data-testid="delete-schedule-dialog-confirm"]').click()

      cy.wait('@deleteSchedule')
      cy.get('[data-testid="schedule-list-success"]').should('be.visible').and('contain', 'excluída')
    })

    it('confirm button is disabled while deletion is in flight', () => {
      cy.intercept('DELETE', `${Cypress.env('API_URL')}/schedules/${mockSchedule.id}`, (req) => {
        req.reply({ delay: 2000, statusCode: 204 })
      }).as('deleteSchedule')

      visitClinic('/schedules', mockProfessionalUser)
      cy.wait('@getSchedules')

      cy.get(`[data-testid="schedule-delete-button-${mockSchedule.id}"]`).click()
      cy.get('[data-testid="delete-schedule-dialog-confirm"]').click()
      cy.get('[data-testid="delete-schedule-dialog-confirm"]').should('be.disabled')
      cy.wait('@deleteSchedule')
    })
  })

  describe('from detail page', () => {
    beforeEach(() => {
      cy.intercept('GET', `${Cypress.env('API_URL')}/schedules/${mockSchedule.id}`, { statusCode: 200, body: mockSchedule }).as('getSchedule')
      cy.intercept('GET', `${Cypress.env('API_URL')}/schedules*`, { statusCode: 200, body: emptyListResponse })
    })

    it('opens confirmation dialog when delete button is clicked', () => {
      visitClinic(`/schedules/${mockSchedule.id}`, mockProfessionalUser)
      cy.wait('@getSchedule')

      cy.get('[data-testid="schedule-details-delete-button"]').click()
      cy.get('[data-testid="delete-schedule-dialog-confirm"]').should('be.visible')
    })

    it('cancels deletion — dialog closes and detail remains', () => {
      visitClinic(`/schedules/${mockSchedule.id}`, mockProfessionalUser)
      cy.wait('@getSchedule')

      cy.get('[data-testid="schedule-details-delete-button"]').click()
      cy.get('[data-testid="delete-schedule-dialog-cancel"]').click()

      cy.get('[data-testid="delete-schedule-dialog-confirm"]').should('not.exist')
      cy.get('[data-testid="schedule-details"]').should('be.visible')
    })

    it('confirms deletion and redirects to /schedules', () => {
      cy.intercept('DELETE', `${Cypress.env('API_URL')}/schedules/${mockSchedule.id}`, { statusCode: 204 }).as('deleteSchedule')

      visitClinic(`/schedules/${mockSchedule.id}`, mockProfessionalUser)
      cy.wait('@getSchedule')

      cy.get('[data-testid="schedule-details-delete-button"]').click()
      cy.get('[data-testid="delete-schedule-dialog-confirm"]').click()

      cy.wait('@deleteSchedule')
      expectClinicPath('/schedules')
    })
  })
})

export {}
