// Stack real ponta a ponta — o ramo "Usuário existente" do formulário de
// criação de paciente (vincular a um usuário já cadastrado via busca) nunca
// tinha teste algum: só o ramo "Novo usuário" era exercitado.

import { CLINIC_SLUG, expectClinicPath } from '../../support/clinic'

const ADMIN_EMAIL = 'admin@pulso.center'
const ADMIN_PASSWORD = '123123123'

describe('Patient creation — existing user mode real', () => {
  beforeEach(() => {
    cy.clearCookies()
    cy.clearLocalStorage()
  })

  it('links a real existing user to a new patient via the search dropdown', () => {
    cy.seedUser().then((user) => {
      const ts = Date.now()
      const document = String(ts).slice(-11).padStart(11, '0')

      cy.loginAsClinicUser(ADMIN_EMAIL, ADMIN_PASSWORD, CLINIC_SLUG).then((adminToken) => {
        cy.visit(`/${CLINIC_SLUG}/patients/new`)
        cy.get('[data-testid="patient-form-user-mode"]', { timeout: 10000 }).should('be.visible')
        cy.get('[data-testid="patient-form-user-mode-existing"]').check({ force: true })

        cy.get('[data-testid="patient-form-fullname"]').should('not.exist')
        cy.get('[data-testid="patient-form-user-search"]').should('be.visible').type(user.fullName.slice(0, 10))

        cy.get('[data-testid="patient-form-user-search-results"]', { timeout: 10000 }).should('be.visible')
        cy.get('[data-testid="patient-form-user-option"]').contains(user.email).click()
        cy.get('[data-testid="patient-form-user-search-results"]').should('not.exist')

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
          expect(created.user.id).to.eq(user.id)
          expect(created.user.email).to.eq(user.email)

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

  it('shows a real conflict error when the selected user already has a patient profile', () => {
    cy.seedPatient().then((patient) => {
      cy.loginAsClinicUser(ADMIN_EMAIL, ADMIN_PASSWORD, CLINIC_SLUG).then((adminToken) => {
        cy.request({
          method: 'GET',
          url: `${Cypress.env('API_URL')}/patients/${patient.patientId}`,
          headers: { Authorization: `Bearer ${adminToken}` },
        }).then((getResponse) => {
          const existingUser = getResponse.body.user

          const ts = Date.now()
          const document = String(ts).slice(-11).padStart(11, '0')

          cy.visit(`/${CLINIC_SLUG}/patients/new`)
          cy.get('[data-testid="patient-form-user-mode-existing"]', { timeout: 10000 }).check({ force: true })
          cy.get('[data-testid="patient-form-user-search"]').type(existingUser.fullName.slice(0, 10))
          cy.get('[data-testid="patient-form-user-search-results"]', { timeout: 10000 }).should('be.visible')
          cy.get('[data-testid="patient-form-user-option"]').contains(existingUser.email).click()

          cy.get('[data-testid="patient-form-phone"]').type('11999998888')
          cy.get('[data-testid="patient-form-document"]').type(document)
          cy.get('[data-testid="patient-form-birthdate"]').type('1990-05-15')
          cy.get('[data-testid="patient-form-gender"]').select('male')
          cy.get('[data-testid="patient-form-submit"]').click()

          cy.get('[data-testid="patient-form-error"]', { timeout: 10000 })
            .should('be.visible')
            .and('contain', 'já')

          cy.deletePatientViaApi(patient.patientId, adminToken)
        })
      })
    })
  })
})
