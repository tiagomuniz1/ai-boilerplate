// Stack real — um ADMIN que também atende pode largar a própria ficha e
// continuar administrando.
//
// O guard antigo barrava qualquer exclusão da própria ficha, de qualquer cargo.
// Isso protegia o PROFESSIONAL, cujo usuário é apagado junto com a ficha e que
// perderia o acesso na hora. Mas prendia o ADMIN: o usuário dele fica intacto,
// então largar a ficha é só "parei de atender" — e, sendo ele o único
// administrador, ninguém mais podia excluí-la. Caminho sem volta.
//
// Sem mock de propósito: o que interessa aqui é o que sobra no banco depois, e
// só a stack real responde isso.

import { CLINIC_SLUG, CLINIC_ID } from '../../support/clinic'

const ADMIN_EMAIL = 'admin@pulso.center'
const ADMIN_PASSWORD = '123123123'

describe('Professionals — ADMIN drops their own profile (real)', () => {
  beforeEach(() => {
    cy.clearCookies()
    cy.clearLocalStorage()
  })

  it('deletes the profile and keeps the account administering the clinic', () => {
    const registrationNumber = String(Date.now()).slice(-6)

    cy.seedSpecialty().then((specialty) => {
      cy.linkSpecialtyToClinicViaApi(CLINIC_ID, specialty.id, specialty.platformAdminToken)

      cy.loginAsClinicUser(ADMIN_EMAIL, ADMIN_PASSWORD, CLINIC_SLUG).then((adminToken) => {
        cy.request({
          method: 'GET',
          url: `${Cypress.env('API_URL')}/auth/me`,
          headers: { Authorization: `Bearer ${adminToken}` },
        }).then((me) => {
          const adminUserId = me.body.id as string
          expect(me.body.role).to.eq('admin')

          // A ficha do próprio administrador — exatamente o caso de quem
          // administra a clínica e também atende.
          cy.createProfessionalViaApi(
            {
              userId: adminUserId,
              registrations: [{ councilType: 'crm', number: registrationNumber, state: 'SP', isPrimary: true }],
              specialties: [{ specialtyId: specialty.id }],
            },
            adminToken,
          ).then((professional) => {
            cy.request({
              method: 'DELETE',
              url: `${Cypress.env('API_URL')}/professionals/${professional.id}`,
              headers: { Authorization: `Bearer ${adminToken}` },
            }).its('status').should('eq', 204)

            // A ficha se foi — o endpoint devolve 200 com corpo vazio, e o que
            // importa é não haver mais uma ficha para o próprio usuário.
            cy.request({
              method: 'GET',
              url: `${Cypress.env('API_URL')}/professionals/me`,
              headers: { Authorization: `Bearer ${adminToken}` },
            }).its('body').should((body) => {
              expect(body).to.not.have.property('id')
            })

            // E a conta continua administrando: o mesmo token ainda lista os
            // usuários da clínica, que é rota exclusiva de ADMIN.
            cy.request({
              method: 'GET',
              url: `${Cypress.env('API_URL')}/users`,
              headers: { Authorization: `Bearer ${adminToken}` },
            }).its('status').should('eq', 200)
          })
        })
      })
    })
  })
})

export {}
