// O seletor de assinatura (registro/especialidade) só aparece para um
// profissional com mais de um registro ou mais de uma especialidade — nenhum
// teste no projeto seedava esse cenário, então o widget nunca foi exercitado.

import { CLINIC_SLUG } from '../../support/clinic'

const ADMIN_EMAIL = 'admin@pulso.center'
const ADMIN_PASSWORD = '123123123'
const DAY_NAMES = ['SUNDAY', 'MONDAY', 'TUESDAY', 'WEDNESDAY', 'THURSDAY', 'FRIDAY', 'SATURDAY'] as const

function futureDateString(daysAhead: number): string {
  const d = new Date(Date.now() + daysAhead * 86400000)
  return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(d.getDate()).padStart(2, '0')}`
}

describe('Professional signature select — real', () => {
  beforeEach(() => {
    cy.clearCookies()
    cy.clearLocalStorage()
  })

  it('lets a multi-specialty professional sign a prescription as a specialty other than the appointment’s own', () => {
    cy.seedSpecialty().then((specialty1) => {
      cy.seedSpecialty().then((specialty2) => {
        cy.loginAsClinicUser(ADMIN_EMAIL, ADMIN_PASSWORD, CLINIC_SLUG).then((adminToken) => {
          const ts = Date.now()
          const email = `multiesp.${ts}@e2e.test`
          const password = 'Password123!'

          cy.createUserViaApi(
            { fullName: `Dr. MultiEspecialidade ${ts}`, email, password, role: 'professional' },
            adminToken,
          ).then((user) => {
            cy.createProfessionalViaApi(
              {
                userId: user.id,
                registrations: [{ councilType: 'crm', number: String(ts).slice(-6), state: 'SP', isPrimary: true }],
                specialties: [{ specialtyId: specialty1.id }, { specialtyId: specialty2.id }],
              },
              adminToken,
            ).then((professional) => {
              cy.seedPatient().then((patient) => {
                const dayOfWeek = DAY_NAMES[new Date().getDay()]

                cy.createScheduleViaApi(
                  { professionalId: professional.id, dayOfWeek, startTime: '08:00', endTime: '18:00', slotDurationInMinutes: 30 },
                  adminToken,
                ).then((schedule) => {
                  cy.createAppointmentViaApi(
                    {
                      professionalId: professional.id,
                      patientId: patient.patientId,
                      specialtyId: specialty1.id,
                      date: futureDateString(14),
                      startTime: '09:00',
                    },
                    adminToken,
                  ).then((appointment) => {
                    cy.loginAsClinicUser(email, password, CLINIC_SLUG).then((professionalToken) => {
                      cy.visit(`/${CLINIC_SLUG}/appointments/${appointment.id}`)
                      cy.get('[data-testid="tab-receitas"]', { timeout: 10000 }).click()
                      cy.get('[data-testid="prescription-new-button"]').click()
                      cy.get('[data-testid="prescription-form"]').should('be.visible')

                      cy.get('[data-testid="professional-signature-select"]', { timeout: 10000 }).should('be.visible')
                      cy.get('[data-testid="professional-signature-crm"]').should('not.exist')
                      cy.get('[data-testid="professional-signature-specialty"]').select(specialty2.id)

                      cy.get('[data-testid="prescription-form-tab-ingredient"]').click()
                      cy.get('[data-testid="prescription-form-manual-input"]').type('Loratadina')
                      cy.get('[data-testid="prescription-form-manual-add"]').click()
                      cy.get('[data-testid="prescription-form-item-instructions-0"]').type('1x ao dia')
                      cy.get('[data-testid="prescription-form-submit"]').click()
                      cy.get('[data-testid="prescription-form"]').should('not.exist')

                      cy.request({
                        method: 'GET',
                        url: `${Cypress.env('API_URL')}/prescriptions?appointmentId=${appointment.id}`,
                        headers: { Authorization: `Bearer ${professionalToken}` },
                      }).then((listResponse) => {
                        const created = listResponse.body[0]
                        expect(created).to.exist

                        // specialtyId não é exposto pelo DTO de listagem — só existe no
                        // snapshot (jsonb) usado para o PDF/verificação pública.
                        cy.task('dbQuery', {
                          sql: 'SELECT snapshot FROM prescriptions WHERE id = $1',
                          params: [created.id],
                        }).then((rows) => {
                          const [row] = rows as { snapshot: { professional: { specialtyName: string | null } } }[]
                          expect(row.snapshot.professional.specialtyName).to.eq(specialty2.name)
                        })

                        cy.deletePrescriptionViaApi(created.id, professionalToken)
                        cy.request({
                          method: 'PATCH',
                          url: `${Cypress.env('API_URL')}/appointments/${appointment.id}/cancel`,
                          headers: { Authorization: `Bearer ${professionalToken}` },
                          body: {},
                        })
                        cy.deleteScheduleViaApi(schedule.id, adminToken)
                        cy.deletePatientViaApi(patient.patientId, adminToken)
                        cy.deleteProfessionalViaApi(professional.id, adminToken)
                        cy.deleteUserViaApi(user.id, adminToken)
                        cy.deleteSpecialtyViaApi(specialty1.id, specialty1.platformAdminToken)
                        cy.deleteSpecialtyViaApi(specialty2.id, specialty2.platformAdminToken)
                      })
                    })
                  })
                })
              })
            })
          })
        })
      })
    })
  })
})
