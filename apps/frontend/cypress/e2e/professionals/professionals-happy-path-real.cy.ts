// Stack real ponta a ponta — cobre a regra de negócio que nenhum mock consegue
// validar: CRM passa por especialidade (RQE), as demais profissões vão direto
// (sem especialidade). Erros, loading e validação continuam mockados nos specs
// irmãos (mais rápidos, sem depender de stack).

import { CLINIC_SLUG, CLINIC_ID, expectClinicPath } from '../../support/clinic'

const ADMIN_EMAIL = 'admin@pulso.center'
const ADMIN_PASSWORD = '123123123'

describe('Professionals — happy path real', () => {
  beforeEach(() => {
    cy.clearCookies()
    cy.clearLocalStorage()
  })

  it('creates a CRM professional linked to a clinic specialty', () => {
    const ts = Date.now()
    const fullName = `Dr. Real ${ts}`
    const email = `professional.real.${ts}@e2e.test`
    const registrationNumber = String(ts).slice(-6)

    cy.seedSpecialty().then((specialty) => {
      cy.linkSpecialtyToClinicViaApi(CLINIC_ID, specialty.id, specialty.platformAdminToken)

      cy.loginAsClinicUser(ADMIN_EMAIL, ADMIN_PASSWORD, CLINIC_SLUG).then((adminToken) => {
        cy.visit(`/${CLINIC_SLUG}/professionals/new`)
        cy.get(`[data-testid="professional-form-specialty-${specialty.id}"]`, { timeout: 10000 }).should('exist')

        cy.get('[data-testid="professional-form-user-mode-new"]').check()
        cy.get('[data-testid="professional-form-fullname"]').type(fullName)
        cy.get('[data-testid="professional-form-email"]').type(email)
        cy.get('[data-testid="professional-form-registration-number-0"]').type(registrationNumber)
        cy.get('[data-testid="professional-form-registration-state-0"]').select('SP')
        cy.get(`[data-testid="professional-form-specialty-${specialty.id}"]`).check()
        cy.get('[data-testid="professional-form-submit"]').click()

        expectClinicPath('/professionals')

        cy.request({
          method: 'GET',
          url: `${Cypress.env('API_URL')}/professionals?search=${encodeURIComponent(fullName)}`,
          headers: { Authorization: `Bearer ${adminToken}` },
        }).then((listResponse) => {
          const created = listResponse.body.data[0]
          expect(created).to.exist
          expect(created.registrations[0].councilType).to.eq('crm')
          expect(created.specialties).to.have.length(1)
          expect(created.specialties[0].id).to.eq(specialty.id)

          cy.get(`[data-testid="professional-table-row-${created.id}"]`, { timeout: 10000 }).should('exist')

          cy.deleteProfessionalViaApi(created.id, adminToken)
          cy.deleteUserViaApi(created.user.id, adminToken)
          cy.unlinkSpecialtyFromClinicViaApi(CLINIC_ID, specialty.id, specialty.platformAdminToken)
          cy.deleteSpecialtyViaApi(specialty.id, specialty.platformAdminToken)
        })
      })
    })
  })

  it('creates a CRN professional with no specialty section', () => {
    const ts = Date.now()
    const fullName = `Nutri Real ${ts}`
    const email = `nutri.real.${ts}@e2e.test`
    const registrationNumber = String(ts).slice(-8)

    cy.loginAsClinicUser(ADMIN_EMAIL, ADMIN_PASSWORD, CLINIC_SLUG).then((adminToken) => {
      cy.visit(`/${CLINIC_SLUG}/professionals/new`)

      cy.get('[data-testid="professional-form-user-mode-new"]').check()
      cy.get('[data-testid="professional-form-fullname"]').type(fullName)
      cy.get('[data-testid="professional-form-email"]').type(email)
      cy.get('[data-testid="professional-form-registration-council-type-0"]').select('crn')
      cy.get('[data-testid="professional-form-registration-number-0"]').type(registrationNumber)
      cy.get('[data-testid="professional-form-registration-state-0"]').select('SP')
      cy.get('[data-testid="professional-form-specialty-group"]').should('not.exist')
      cy.get('[data-testid="professional-form-submit"]').click()

      expectClinicPath('/professionals')

      cy.request({
        method: 'GET',
        url: `${Cypress.env('API_URL')}/professionals?search=${encodeURIComponent(fullName)}`,
        headers: { Authorization: `Bearer ${adminToken}` },
      }).then((listResponse) => {
        const created = listResponse.body.data[0]
        expect(created).to.exist
        expect(created.registrations[0].councilType).to.eq('crn')
        expect(created.specialties).to.deep.equal([])

        cy.deleteProfessionalViaApi(created.id, adminToken)
        cy.deleteUserViaApi(created.user.id, adminToken)
      })
    })
  })
})
