// Stack real ponta a ponta — um profissional com múltiplos registros (ex:
// CRN + CREFITO) nunca foi testado: professional-form-registration-add
// (botão "+ Adicionar registro") não tinha cobertura alguma.

import { CLINIC_SLUG, expectClinicPath } from '../../support/clinic'

const ADMIN_EMAIL = 'admin@pulso.center'
const ADMIN_PASSWORD = '123123123'

describe('Professional creation — multiple registrations real', () => {
  beforeEach(() => {
    cy.clearCookies()
    cy.clearLocalStorage()
  })

  it('creates a professional with two real registrations via the real form', () => {
    const ts = Date.now()
    const fullName = `Multi Registro Real ${ts}`
    const email = `multi.registro.${ts}@e2e.test`
    const crnNumber = String(ts).slice(-8)
    const crefitoNumber = `${String(ts).slice(-6)}-F`

    cy.loginAsClinicUser(ADMIN_EMAIL, ADMIN_PASSWORD, CLINIC_SLUG).then((adminToken) => {
      cy.visit(`/${CLINIC_SLUG}/professionals/new`)
      cy.get('[data-testid="professional-form-user-mode-new"]').check()
      cy.get('[data-testid="professional-form-fullname"]').type(fullName)
      cy.get('[data-testid="professional-form-email"]').type(email)

      cy.get('[data-testid="professional-form-registration-council-type-0"]').select('crn')
      cy.get('[data-testid="professional-form-registration-number-0"]').type(crnNumber)
      cy.get('[data-testid="professional-form-registration-state-0"]').select('SP')
      cy.get('[data-testid="professional-form-registration-primary-0"]').should('be.checked')

      cy.get('[data-testid="professional-form-registration-add"]').click()
      cy.get('[data-testid="professional-form-registration-row-1"]').should('be.visible')
      cy.get('[data-testid="professional-form-registration-council-type-1"]').select('crefito')
      cy.get('[data-testid="professional-form-registration-number-1"]').type(crefitoNumber)
      cy.get('[data-testid="professional-form-registration-state-1"]').select('RJ')

      cy.get('[data-testid="professional-form-registration-primary-1"]').check({ force: true })
      cy.get('[data-testid="professional-form-registration-primary-0"]').should('not.be.checked')

      cy.get('[data-testid="professional-form-submit"]').click()

      expectClinicPath('/professionals')

      cy.request({
        method: 'GET',
        url: `${Cypress.env('API_URL')}/professionals?search=${encodeURIComponent(fullName)}`,
        headers: { Authorization: `Bearer ${adminToken}` },
      }).then((listResponse) => {
        const created = listResponse.body.data[0]
        expect(created).to.exist
        expect(created.registrations).to.have.length(2)

        const crn = created.registrations.find((r: any) => r.councilType === 'crn')
        const crefito = created.registrations.find((r: any) => r.councilType === 'crefito')
        expect(crn.number).to.eq(crnNumber)
        expect(crn.state).to.eq('SP')
        expect(crefito.number).to.eq(crefitoNumber)
        expect(crefito.state).to.eq('RJ')
        expect(crefito.isPrimary).to.eq(true)
        expect(crn.isPrimary).to.eq(false)

        cy.deleteProfessionalViaApi(created.id, adminToken)
        cy.deleteUserViaApi(created.user.id, adminToken)
      })
    })
  })
})
