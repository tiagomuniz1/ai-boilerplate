// Auditoria dos estados 403 ad hoc (cada tela implementa o próprio alerta
// inline, não há error boundary global): mapeamento encontrou 7 testids desse
// tipo no app inteiro, dos quais 3 nunca tinham teste algum — cobertos aqui
// contra o backend real.

import { CLINIC_SLUG, CLINIC_ID } from '../../support/clinic'

const ADMIN_EMAIL = 'admin@pulso.center'
const ADMIN_PASSWORD = '123123123'

describe('Ad hoc forbidden states — real', () => {
  beforeEach(() => {
    cy.clearCookies()
    cy.clearLocalStorage()
  })

  it('PROFESSIONAL sees the forbidden alert on the patients list page', () => {
    cy.seedProfessional().then((professional) => {
      cy.loginAsClinicUser(professional.email, professional.password, CLINIC_SLUG)
      cy.visit(`/${CLINIC_SLUG}/patients`)
      cy.get('[data-testid="patients-page-forbidden"]', { timeout: 10000 }).should('be.visible')
      cy.get('[data-testid="patient-list"]').should('not.exist')

      cy.deleteProfessionalViaApi(professional.professionalId, professional.accessToken)
      cy.deleteUserViaApi(professional.userId, professional.accessToken)
      cy.deleteSpecialtyViaApi(professional.specialtyId, professional.platformAdminToken)
    })
  })

  it('USER sees the forbidden alert on a real template details page and its edit page', () => {
    cy.seedProfessional().then((professional) => {
      cy.linkSpecialtyToClinicViaApi(CLINIC_ID, professional.specialtyId, professional.platformAdminToken)
      cy.createMedicalRecordTemplateViaApi(
        {
          specialtyId: professional.specialtyId,
          name: `Template Forbidden Real ${Date.now()}`,
          fields: [{ label: 'Sintoma', type: 'text', required: true, order: 0, canonical: false }],
        },
        professional.accessToken,
      ).then((template) => {
        cy.seedUser().then((user) => {
          cy.loginAsClinicUser(user.email, 'Password123!', CLINIC_SLUG)
          cy.visit(`/${CLINIC_SLUG}/medical-record-templates/${template.id}`)
          cy.get('[data-testid="medical-record-template-details-page-forbidden"]', { timeout: 10000 }).should('be.visible')

          cy.visit(`/${CLINIC_SLUG}/medical-record-templates/${template.id}/edit`)
          cy.get('[data-testid="edit-medical-record-template-page-forbidden"]', { timeout: 10000 }).should('be.visible')

          cy.deleteUserViaApi(user.id, professional.accessToken)
          cy.deleteMedicalRecordTemplateViaApi(template.id, professional.accessToken)
          cy.deleteProfessionalViaApi(professional.professionalId, professional.accessToken)
          cy.deleteUserViaApi(professional.userId, professional.accessToken)
          cy.unlinkSpecialtyFromClinicViaApi(CLINIC_ID, professional.specialtyId, professional.platformAdminToken)
          cy.deleteSpecialtyViaApi(professional.specialtyId, professional.platformAdminToken)
        })
      })
    })
  })
})
