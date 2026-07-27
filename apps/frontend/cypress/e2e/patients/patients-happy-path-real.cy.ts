// Stack real ponta a ponta (sem mocks) — o happy path de criar/editar paciente
// bate no backend de verdade. Erros, loading e validação continuam mockados em
// patients-create.cy.ts / patients-update.cy.ts (mais rápidos, sem depender de stack).

import { CLINIC_SLUG, expectClinicPath } from '../../support/clinic'

const ADMIN_EMAIL = 'admin@pulso.center'
const ADMIN_PASSWORD = '123123123'

describe('Patients — happy path real', () => {
  beforeEach(() => {
    cy.clearCookies()
    cy.clearLocalStorage()
  })

  it('creates a patient via the real form, then edits it, against the real backend', () => {
    const ts = Date.now()
    const document = String(ts).slice(-11).padStart(11, '0')
    const fullName = `Paciente Real ${ts}`
    const email = `paciente.real.${ts}@e2e.test`
    const updatedFullName = `Paciente Real Atualizado ${ts}`
    const updatedEmail = `paciente.real.atualizado.${ts}@e2e.test`

    cy.loginAsClinicUser(ADMIN_EMAIL, ADMIN_PASSWORD, CLINIC_SLUG).then((adminToken) => {
      cy.visit(`/${CLINIC_SLUG}/patients/new`)
      cy.get('[data-testid="patient-form-fullname"]').type(fullName)
      cy.get('[data-testid="patient-form-email"]').type(email)
      cy.get('[data-testid="patient-form-phone"]').type('11999998888')
      cy.get('[data-testid="patient-form-document"]').type(document)
      cy.get('[data-testid="patient-form-birthdate"]').type('1990-05-15')
      cy.get('[data-testid="patient-form-gender"]').select('male')
      cy.get('[data-testid="patient-form-submit"]').click()

      expectClinicPath('/patients')

      cy.request({
        method: 'GET',
        url: `${Cypress.env('API_URL')}/patients?search=${document}`,
        headers: { Authorization: `Bearer ${adminToken}` },
      }).then((listResponse) => {
        const created = listResponse.body.data[0]
        expect(created).to.exist
        expect(created.user.email).to.eq(email)

        cy.get(`[data-testid="patient-table-row-${created.id}"]`, { timeout: 10000 }).should('exist')

        cy.visit(`/${CLINIC_SLUG}/patients/${created.id}/edit`)
        cy.get('[data-testid="patient-form-fullname"]', { timeout: 10000 }).should('have.value', fullName)
        cy.get('[data-testid="patient-form-fullname"]').clear().type(updatedFullName)
        cy.get('[data-testid="patient-form-email"]').clear().type(updatedEmail)
        cy.get('[data-testid="patient-form-submit"]').click()

        expectClinicPath(`/patients/${created.id}`)
        cy.get('[data-testid="patient-details-name"]', { timeout: 10000 }).should('contain', updatedFullName)

        cy.request({
          method: 'DELETE',
          url: `${Cypress.env('API_URL')}/patients/${created.id}`,
          headers: { Authorization: `Bearer ${adminToken}` },
          failOnStatusCode: false,
        })
      })
    })
  })
})
