// Full stack: proves the two rules only a real backend can enforce — the series
// shares one seriesId with sequential occurrences derived from the professional's
// actual schedule, and cancelling with the series scope really cancels the later
// occurrences. Loading/error/validation states stay mocked in
// appointments-recurrence-book.cy.ts.

import { CLINIC_SLUG } from '../../support/clinic'

const DAY_NAMES = ['SUNDAY', 'MONDAY', 'TUESDAY', 'WEDNESDAY', 'THURSDAY', 'FRIDAY', 'SATURDAY'] as const

function toLocalDate(date: Date): string {
  const year = date.getFullYear()
  const month = String(date.getMonth() + 1).padStart(2, '0')
  const day = String(date.getDate()).padStart(2, '0')
  return `${year}-${month}-${day}`
}

function addWeeks(date: string, weeks: number): string {
  const result = new Date(`${date}T00:00:00Z`)
  result.setUTCDate(result.getUTCDate() + weeks * 7)
  return result.toISOString().slice(0, 10)
}

describe('Appointments — recurring series (real stack)', () => {
  beforeEach(() => {
    cy.clearCookies()
    cy.clearLocalStorage()
  })

  it('books a weekly series and cancels it from one occurrence onwards', () => {
    cy.seedProfessional().then((professional) => {
      cy.seedPatient().then((patient) => {
        const dayOfWeek = DAY_NAMES[new Date().getDay()]

        cy.createScheduleViaApi(
          {
            professionalId: professional.professionalId,
            dayOfWeek,
            startTime: '08:00',
            endTime: '18:00',
            slotDurationInMinutes: 30,
          },
          professional.accessToken,
        ).then((schedule) => {
          cy.loginAsClinicUser(professional.email, professional.password, CLINIC_SLUG).then(
            (professionalToken) => {
              cy.visit(`/${CLINIC_SLUG}/appointments`)
              // Two weeks forward so every occurrence of the series is in the future.
              cy.get('[data-testid="toolbar-next"]', { timeout: 10000 }).click()
              cy.get('[data-testid="toolbar-next"]').click()

              cy.get('[data-testid="agenda-slot-free"]:not([disabled])', { timeout: 10000 })
                .first()
                .click()
              cy.get('[data-testid="book-appointment-dialog"]').should('be.visible')
              cy.get('[data-testid="book-dialog-patient"]').select(patient.patientId)
              cy.get('[data-testid="book-dialog-recurrence-toggle"]').check()
              cy.get('[data-testid="book-dialog-recurrence-occurrences"]').clear().type('3')
              cy.get('[data-testid="book-dialog-submit"]').click()

              cy.get('[data-testid="recurrence-preview-list"]', { timeout: 10000 })
                .find('li')
                .should('have.length', 3)
              cy.get('[data-testid="recurrence-preview-selected-count"]').should(
                'contain.text',
                '3 datas',
              )
              cy.get('[data-testid="book-dialog-recurrence-confirm"]').click()
              cy.get('[data-testid="book-appointment-dialog"]').should('not.exist')

              cy.request({
                method: 'GET',
                url: `${Cypress.env('API_URL')}/appointments?patientId=${patient.patientId}&limit=100`,
                headers: { Authorization: `Bearer ${professionalToken}` },
              }).then((listResponse) => {
                const created = listResponse.body.data
                expect(created).to.have.length(3)

                const seriesIds = new Set(created.map((a: { seriesId: string }) => a.seriesId))
                expect(seriesIds.size, 'all occurrences share one series').to.equal(1)

                const byDate = [...created].sort((a: { date: string }, b: { date: string }) =>
                  a.date.localeCompare(b.date),
                )
                expect(byDate.map((a: { seriesSequence: number }) => a.seriesSequence)).to.deep.equal([
                  1, 2, 3,
                ])
                expect(byDate.every((a: { seriesTotalOccurrences: number }) => a.seriesTotalOccurrences === 3)).to
                  .be.true
                expect(byDate[1].date).to.equal(addWeeks(byDate[0].date, 1))
                expect(byDate[2].date).to.equal(addWeeks(byDate[0].date, 2))
                expect(byDate.every((a: { startTime: string }) => a.startTime === byDate[0].startTime)).to.be
                  .true

                // Cancel from the second occurrence onwards.
                cy.visit(`/${CLINIC_SLUG}/appointments/${byDate[1].id}`)
                cy.get('[data-testid="appointment-detail-series"]', { timeout: 10000 }).should(
                  'contain.text',
                  'Sessão 2 de 3',
                )
                cy.get('[data-testid="appointment-detail-cancel-button"]').click()
                cy.get('[data-testid="cancel-dialog-scope-series"]').check()
                cy.get('[data-testid="cancel-dialog-confirm"]').click()

                cy.request({
                  method: 'GET',
                  url: `${Cypress.env('API_URL')}/appointments?patientId=${patient.patientId}&limit=100`,
                  headers: { Authorization: `Bearer ${professionalToken}` },
                }).then((afterResponse) => {
                  const after = [...afterResponse.body.data].sort(
                    (a: { date: string }, b: { date: string }) => a.date.localeCompare(b.date),
                  )
                  expect(after.map((a: { status: string }) => a.status)).to.deep.equal([
                    'scheduled',
                    'cancelled',
                    'cancelled',
                  ])
                })
              })

              cy.deleteScheduleViaApi(schedule.id, professionalToken)
            },
          )
        })
      })
    })
  })

  it('marks an occurrence that is already booked as unavailable in the preview', () => {
    cy.seedProfessional().then((professional) => {
      cy.seedPatient().then((patient) => {
        const dayOfWeek = DAY_NAMES[new Date().getDay()]
        // The schedule covers only today's weekday, and the agenda is navigated two
        // weeks forward — so the first free slot is deterministically today + 14
        // at the schedule's opening time.
        const anchorDate = addWeeks(toLocalDate(new Date()), 2)
        const conflictingDate = addWeeks(anchorDate, 1)

        cy.createScheduleViaApi(
          {
            professionalId: professional.professionalId,
            dayOfWeek,
            startTime: '08:00',
            endTime: '18:00',
            slotDurationInMinutes: 30,
          },
          professional.accessToken,
        ).then((schedule) => {
          cy.loginAsClinicUser(professional.email, professional.password, CLINIC_SLUG).then(
            (professionalToken) => {
              cy.createAppointmentViaApi(
                {
                  professionalId: professional.professionalId,
                  patientId: patient.patientId,
                  date: conflictingDate,
                  startTime: '08:00',
                },
                professionalToken,
              )

              cy.visit(`/${CLINIC_SLUG}/appointments`)
              cy.get('[data-testid="toolbar-next"]', { timeout: 10000 }).click()
              cy.get('[data-testid="toolbar-next"]').click()

              cy.get('[data-testid="agenda-slot-free"]:not([disabled])', { timeout: 10000 })
                .first()
                .click()
              cy.get('[data-testid="book-dialog-patient"]').select(patient.patientId)
              cy.get('[data-testid="book-dialog-recurrence-toggle"]').check()
              cy.get('[data-testid="book-dialog-recurrence-occurrences"]').clear().type('3')
              cy.get('[data-testid="book-dialog-submit"]').click()

              cy.get(`[data-testid="recurrence-preview-status-${conflictingDate}"]`, {
                timeout: 10000,
              }).should('contain.text', 'Ocupado')
              cy.get(`[data-testid="recurrence-preview-checkbox-${conflictingDate}"]`).should(
                'be.disabled',
              )
              cy.get('[data-testid="recurrence-preview-selected-count"]').should(
                'contain.text',
                '2 datas',
              )

              cy.deleteScheduleViaApi(schedule.id, professionalToken)
            },
          )
        })
      })
    })
  })
})
