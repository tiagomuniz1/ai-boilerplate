// Aprofunda medical-record-templates-happy-path-real.cy.ts: cobre a adoção de
// campo canônico (canonical-field-picker) e a reordenação via botões
// "mover para cima/baixo" contra o backend real — nenhum dos dois nunca bateu
// no backend real (drag-and-drop tem suporte limitado no Cypress, por isso os
// botões de mover são o caminho testado).

import { CLINIC_SLUG, CLINIC_ID } from '../../support/clinic'

const ADMIN_EMAIL = 'admin@pulso.center'
const ADMIN_PASSWORD = '123123123'

describe('Medical record templates — canonical field adoption and reorder real', () => {
  beforeEach(() => {
    cy.clearCookies()
    cy.clearLocalStorage()
  })

  it('adopts a real canonical field and reorders fields via move up/down before saving', () => {
    cy.seedSpecialty().then((specialty) => {
      cy.linkSpecialtyToClinicViaApi(CLINIC_ID, specialty.id, specialty.platformAdminToken)

      const ts = Date.now()
      cy.createCanonicalFieldViaApi(
        // Sem escopo: o catálogo é global e o campo aparece no seletor de
        // qualquer modelo, com ou sem especialidade escolhida.
        { canonicalKey: `pressao_arterial_${ts}`, label: `Pressão arterial ${ts}`, type: 'number', unit: 'mmHg' },
        specialty.platformAdminToken,
      ).then((canonicalField) => {
        cy.loginAsClinicUser(ADMIN_EMAIL, ADMIN_PASSWORD, CLINIC_SLUG).then((adminToken) => {
          cy.visit(`/${CLINIC_SLUG}/medical-record-templates/new`)
          cy.get('[data-testid="template-form-specialty"]', { timeout: 10000 }).should('be.visible')
          cy.get('[data-testid="template-form-name"]').type(`Reorder Real ${ts}`)
          cy.get('[data-testid="template-form-specialty"]').select(specialty.id)

          // Manual field first
          cy.get('[data-testid="template-form-add-field"]').click()
          cy.get('[data-testid="field-editor-label-0"]').type('Sintoma')

          // Adopt the real canonical field — becomes field index 1
          cy.get(`[data-testid="canonical-field-picker-adopt-${canonicalField.id}"]`, { timeout: 10000 }).click()
          cy.get('[data-testid="field-editor-label-1"]').should('have.value', canonicalField.label)

          // Move the adopted field (index 1) up, so it becomes index 0
          cy.get('[data-testid="field-editor-move-up-1"]').click()
          cy.get('[data-testid="field-editor-label-0"]').should('have.value', canonicalField.label)
          cy.get('[data-testid="field-editor-label-1"]').should('have.value', 'Sintoma')

          cy.get('[data-testid="template-form-submit"]').click()
          cy.location('pathname', { timeout: 10000 }).should('eq', `/${CLINIC_SLUG}/medical-record-templates`)

          cy.request({
            method: 'GET',
            url: `${Cypress.env('API_URL')}/medical-record-templates?specialtyId=${specialty.id}`,
            headers: { Authorization: `Bearer ${adminToken}` },
          }).then((listResponse) => {
            const created = listResponse.body.data[0]
            expect(created).to.exist

            const sortedFields = [...created.fields].sort((a: { order: number }, b: { order: number }) => a.order - b.order)
            expect(sortedFields[0].canonical).to.eq(true)
            expect(sortedFields[0].canonicalKey).to.eq(canonicalField.canonicalKey)
            expect(sortedFields[0].label).to.eq(canonicalField.label)
            expect(sortedFields[1].label).to.eq('Sintoma')
            expect(sortedFields[1].canonical).to.eq(false)

            cy.request({
              method: 'DELETE',
              url: `${Cypress.env('API_URL')}/medical-record-templates/${created.id}`,
              headers: { Authorization: `Bearer ${adminToken}` },
            })
            cy.request({
              method: 'PATCH',
              url: `${Cypress.env('API_URL')}/medical-record-canonical-fields/${canonicalField.id}`,
              headers: { Authorization: `Bearer ${specialty.platformAdminToken}` },
              body: { isActive: false },
            })
            cy.unlinkSpecialtyFromClinicViaApi(CLINIC_ID, specialty.id, specialty.platformAdminToken)
            cy.deleteSpecialtyViaApi(specialty.id, specialty.platformAdminToken)
          })
        })
      })
    })
  })
})
