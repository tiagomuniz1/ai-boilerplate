// Stack real — um ADMIN que também atende pode largar a própria ficha e
// continuar administrando.
//
// O guard antigo barrava qualquer exclusão da própria ficha, de qualquer cargo.
// Isso protegia o PROFESSIONAL, cujo usuário é apagado junto com a ficha e que
// perderia o acesso na hora. Mas prendia o ADMIN: o usuário dele fica intacto,
// então largar a ficha é só "parei de atender" — e, sendo ele o único
// administrador, ninguém mais podia excluí-la. Caminho sem volta.
//
// Sem mock de propósito: o que interessa é o que sobra no banco depois, e só a
// stack real responde isso.
//
// O teste cria o próprio administrador em vez de reaproveitar `admin@pulso.center`.
// A conta semeada é compartilhada com o resto da suíte, e outros specs deixam uma
// ficha nela — reusá-la fazia o POST devolver 409 conforme a ordem de execução.

import { CLINIC_SLUG, CLINIC_ID } from '../../support/clinic'

const PASSWORD = 'Password123!'

describe('Professionals — ADMIN drops their own profile (real)', () => {
  beforeEach(() => {
    cy.clearCookies()
    cy.clearLocalStorage()
  })

  it('deletes the profile and keeps the account administering the clinic', () => {
    const ts = Date.now()
    const email = `admin.practises.${ts}@e2e.test`
    const registrationNumber = String(ts).slice(-6)

    cy.seedSpecialty().then((specialty) => {
      cy.linkSpecialtyToClinicViaApi(CLINIC_ID, specialty.id, specialty.platformAdminToken)

      cy.loginAsClinicUser('admin@pulso.center', '123123123', CLINIC_SLUG).then((seedAdminToken) => {
        cy.createUserViaApi(
          { fullName: `Admin Who Practises ${ts}`, email, password: PASSWORD, role: 'admin' },
          seedAdminToken,
        ).then((createdUser) => {
          // A ficha do próprio administrador — quem administra a clínica e
          // também atende.
          cy.createProfessionalViaApi(
            {
              userId: createdUser.id,
              registrations: [{ councilType: 'crm', number: registrationNumber, state: 'SP', isPrimary: true }],
              specialties: [{ specialtyId: specialty.id }],
            },
            seedAdminToken,
          ).then((professional) => {
            cy.loginAsClinicUser(email, PASSWORD, CLINIC_SLUG).then((ownToken) => {
              cy.request({
                method: 'GET',
                url: `${Cypress.env('API_URL')}/professionals/me`,
                headers: { Authorization: `Bearer ${ownToken}` },
              }).its('body.id').should('eq', professional.id)

              cy.request({
                method: 'DELETE',
                url: `${Cypress.env('API_URL')}/professionals/${professional.id}`,
                headers: { Authorization: `Bearer ${ownToken}` },
              }).its('status').should('eq', 204)

              // A ficha se foi — o endpoint devolve 200 com corpo vazio, e o que
              // importa é não haver mais ficha para o próprio usuário.
              cy.request({
                method: 'GET',
                url: `${Cypress.env('API_URL')}/professionals/me`,
                headers: { Authorization: `Bearer ${ownToken}` },
              }).its('body').should((body) => {
                expect(body).to.not.have.property('id')
              })

              // E a conta continua administrando: o mesmo token ainda lista os
              // usuários da clínica, que é rota exclusiva de ADMIN.
              cy.request({
                method: 'GET',
                url: `${Cypress.env('API_URL')}/users`,
                headers: { Authorization: `Bearer ${ownToken}` },
              }).its('status').should('eq', 200)

              cy.deleteUserViaApi(createdUser.id, seedAdminToken)
            })
          })
        })
      })
    })
  })
})

export {}
