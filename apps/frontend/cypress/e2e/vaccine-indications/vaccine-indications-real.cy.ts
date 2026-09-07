// Indicação de vacina na stack real. É documento assinado que sai da clínica,
// então o que importa aqui é o que o backend grava e devolve — não o que a tela
// diz ter enviado.

import { CLINIC_SLUG } from '../../support/clinic'

const DAY_NAMES = ['SUNDAY', 'MONDAY', 'TUESDAY', 'WEDNESDAY', 'THURSDAY', 'FRIDAY', 'SATURDAY'] as const

function futureDateString(daysAhead: number): string {
  const d = new Date(Date.now() + daysAhead * 86400000)
  return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(d.getDate()).padStart(2, '0')}`
}

function seedAppointment() {
  return cy.seedProfessional().then((professional) =>
    cy.seedPatient().then((patient) => {
      const dayOfWeek = DAY_NAMES[new Date().getDay()]
      return cy
        .createScheduleViaApi(
          { professionalId: professional.professionalId, dayOfWeek, startTime: '08:00', endTime: '18:00', slotDurationInMinutes: 30 },
          professional.accessToken,
        )
        .then((schedule) =>
          cy
            .createAppointmentViaApi(
              {
                professionalId: professional.professionalId,
                patientId: patient.patientId,
                specialtyId: professional.specialtyId,
                date: futureDateString(14),
                startTime: '09:00',
              },
              professional.accessToken,
            )
            .then((appointment) => ({ professional, patient, schedule, appointment })),
        )
    }),
  )
}

function cleanup(ctx: { professional: any; patient: any; schedule: any }) {
  cy.deleteScheduleViaApi(ctx.schedule.id, ctx.professional.accessToken)
  cy.deletePatientViaApi(ctx.patient.patientId, ctx.professional.accessToken)
  cy.deleteProfessionalViaApi(ctx.professional.professionalId, ctx.professional.accessToken)
  cy.deleteUserViaApi(ctx.professional.userId, ctx.professional.accessToken)
  cy.deleteSpecialtyViaApi(ctx.professional.specialtyId, ctx.professional.platformAdminToken)
}

describe('Indicação de vacina — stack real', () => {
  // O catálogo de vacinas é GLOBAL, sem clinicId, e o E2E roda contra o banco
  // de desenvolvimento. Limpar no fim do teste não basta: se uma asserção falha
  // antes, a limpeza nunca roda e a vacina de teste fica no catálogo que a
  // clínica enxerga. Rastrear e limpar no afterEach, que roda de qualquer jeito.
  const vacinasCriadas: string[] = []
  let platformAdminToken: string

  function criarVacinaDeTeste(nome: string, token: string, sigla: string | null = null) {
    platformAdminToken = token
    return cy.createVaccineViaApi({ name: nome, abbreviation: sigla }, token).then((vacina) => {
      vacinasCriadas.push(vacina.id)
      return vacina
    })
  }

  beforeEach(() => {
    cy.clearCookies()
    cy.clearLocalStorage()
  })

  afterEach(() => {
    while (vacinasCriadas.length) {
      cy.deleteVaccineViaApi(vacinasCriadas.pop()!, platformAdminToken)
    }
  })

  it('emite a indicação e o backend grava a vacina do catálogo', () => {
    cy.seedSpecialty().then((catalogSeed) => {
      const vaccineName = `Tríplice viral Real ${Date.now()}`
      criarVacinaDeTeste(vaccineName, catalogSeed.platformAdminToken, 'SCR').then((vaccine) => {
        seedAppointment().then((ctx) => {
          cy.loginAsClinicUser(ctx.professional.email, ctx.professional.password, CLINIC_SLUG).then((token) => {
            cy.visit(`/${CLINIC_SLUG}/appointments/${ctx.appointment.id}`)
            cy.get('[data-testid="tab-vacinas"]', { timeout: 10000 }).click()

            cy.get('[data-testid="vaccine-indication-new-button"]').click()
            cy.get('[data-testid="vaccine-indication-form"]').should('be.visible')
            cy.get('[data-testid="vaccine-indication-vaccine-select-0"]').select(vaccine.id)
            cy.get('[data-testid="vaccine-indication-dose-input-0"]').type('1ª dose')
            cy.get('[data-testid="vaccine-indication-instructions-input-0"]').type('Aplicar em serviço de imunização')
            cy.get('[data-testid="vaccine-indication-submit"]').click()
            cy.get('[data-testid="vaccine-indication-form"]').should('not.exist')

            cy.request({
              method: 'GET',
              url: `${Cypress.env('API_URL')}/vaccine-indications?appointmentId=${ctx.appointment.id}`,
              headers: { Authorization: `Bearer ${token}` },
            }).then((response) => {
              expect(response.body).to.have.length(1)
              const indication = response.body[0]
              expect(indication.items).to.have.length(1)
              expect(indication.items[0].vaccineId).to.eq(vaccine.id)
              expect(indication.items[0].name).to.eq(vaccineName)
              expect(indication.items[0].doseLabel).to.eq('1ª dose')
              expect(indication.professionalId).to.eq(ctx.professional.professionalId)
              expect(indication.patientId).to.eq(ctx.patient.patientId)
            })

            // A lista mostra a vacina pelo nome, não uma contagem.
            cy.get('[data-testid="vaccine-indication-section-list"]').should('contain', vaccineName)
            cleanup(ctx)
          })
        })
      })
    })
  })

  it('gera um PDF de verdade', () => {
    cy.seedSpecialty().then((catalogSeed) => {
      criarVacinaDeTeste(`Hepatite B Real ${Date.now()}`, catalogSeed.platformAdminToken).then((vaccine) => {
        seedAppointment().then((ctx) => {
          cy.loginAsClinicUser(ctx.professional.email, ctx.professional.password, CLINIC_SLUG).then((token) => {
            cy.request({
              method: 'POST',
              url: `${Cypress.env('API_URL')}/vaccine-indications`,
              body: { appointmentId: ctx.appointment.id, items: [{ vaccineId: vaccine.id }] },
              headers: { Authorization: `Bearer ${token}` },
            }).then((created) => {
              cy.request({
                method: 'GET',
                url: `${Cypress.env('API_URL')}/vaccine-indications/${created.body.id}/pdf`,
                headers: { Authorization: `Bearer ${token}` },
                encoding: 'binary',
              }).then((pdf) => {
                expect(pdf.headers['content-type']).to.contain('application/pdf')
                expect(pdf.body.slice(0, 4)).to.eq('%PDF')
              })
              cleanup(ctx)
            })
          })
        })
      })
    })
  })

  // Indicar é exercício e o documento leva o registro de quem assina: um
  // profissional não emite sobre a consulta de outro.
  it('o backend recusa indicar sobre consulta de outro profissional', () => {
    cy.seedSpecialty().then((catalogSeed) => {
      criarVacinaDeTeste(`dTpa Real ${Date.now()}`, catalogSeed.platformAdminToken).then((vaccine) => {
        seedAppointment().then((ctx) => {
          cy.seedProfessional().then((outroProfissional) => {
            cy.loginAsClinicUser(outroProfissional.email, outroProfissional.password, CLINIC_SLUG).then((outroToken) => {
              cy.request({
                method: 'POST',
                url: `${Cypress.env('API_URL')}/vaccine-indications`,
                body: { appointmentId: ctx.appointment.id, items: [{ vaccineId: vaccine.id }] },
                headers: { Authorization: `Bearer ${outroToken}` },
                failOnStatusCode: false,
              }).then((response) => {
                expect(response.status).to.eq(403)
              })

              cy.deleteProfessionalViaApi(outroProfissional.professionalId, outroProfissional.accessToken)
              cy.deleteUserViaApi(outroProfissional.userId, outroProfissional.accessToken)
              cy.deleteSpecialtyViaApi(outroProfissional.specialtyId, outroProfissional.platformAdminToken)
              cleanup(ctx)
            })
          })
        })
      })
    })
  })

  it('exclui a indicação emitida', () => {
    cy.seedSpecialty().then((catalogSeed) => {
      criarVacinaDeTeste(`BCG Real ${Date.now()}`, catalogSeed.platformAdminToken).then((vaccine) => {
        seedAppointment().then((ctx) => {
          cy.loginAsClinicUser(ctx.professional.email, ctx.professional.password, CLINIC_SLUG).then((token) => {
            cy.request({
              method: 'POST',
              url: `${Cypress.env('API_URL')}/vaccine-indications`,
              body: { appointmentId: ctx.appointment.id, items: [{ vaccineId: vaccine.id }] },
              headers: { Authorization: `Bearer ${token}` },
            }).then((created) => {
              cy.visit(`/${CLINIC_SLUG}/appointments/${ctx.appointment.id}`)
              cy.get('[data-testid="tab-vacinas"]', { timeout: 10000 }).click()

              cy.get(`[data-testid="vaccine-indication-delete-button-${created.body.id}"]`).click()
              cy.get('[data-testid="vaccine-indication-delete-dialog-confirm"]').click()
              cy.get('[data-testid="vaccine-indication-section-empty"]').should('be.visible')

              cy.request({
                method: 'GET',
                url: `${Cypress.env('API_URL')}/vaccine-indications?appointmentId=${ctx.appointment.id}`,
                headers: { Authorization: `Bearer ${token}` },
              }).then((response) => {
                expect(response.body).to.have.length(0)
              })
              cleanup(ctx)
            })
          })
        })
      })
    })
  })
})

export {}
