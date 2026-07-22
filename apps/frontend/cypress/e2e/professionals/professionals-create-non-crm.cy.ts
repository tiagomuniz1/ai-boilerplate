import { visitClinic, expectClinicPath, CLINIC_ID } from '../../support/clinic'

// Cobre o rework do formulário com seletor de conselho dinâmico: cria um
// profissional CRN (nutricionista), validando máscara/placeholder por conselho
// e a ausência do campo de RQE (exclusivo de CRM).

const SPEC_ID_1 = '00000000-0000-4000-a000-000000000001'

const mockAuthUser = {
  id: 'mock-auth-user-id',
  fullName: 'Mock Admin',
  email: 'mock@admin.com',
  role: 'admin',
}

const mockClinicSpecialties = [
  { id: 'link-1', clinicId: CLINIC_ID, specialtyId: SPEC_ID_1, name: 'Nutrição Clínica', description: null, linkedAt: '2024-01-01T00:00:00.000Z' },
]
const specialtiesListResponse = { data: mockClinicSpecialties, total: 1, page: 1, limit: 100 }

const mockCreatedProfessional = {
  id: 'cccccccc-3333-3333-3333-000000000001',
  user: { id: 'user-uuid-2', fullName: 'Ana Nutricionista', email: 'ana@test.com' },
  registrations: [{ id: 'reg-1', councilType: 'crn', number: '12345678', state: 'SP', isPrimary: true }],
  specialties: [{ id: SPEC_ID_1, name: 'Nutrição Clínica', registryNumber: null }],
  bio: null,
  createdAt: '2024-01-15T10:00:00.000Z',
  updatedAt: '2024-01-15T10:00:00.000Z',
}

describe('Professionals Create — non-CRM council type', () => {
  beforeEach(() => {
    cy.clearCookies()
    cy.clearLocalStorage()
    cy.intercept('GET', `${Cypress.env('API_URL')}/clinics/${CLINIC_ID}/specialties*`, {
      statusCode: 200,
      body: specialtiesListResponse,
    }).as('getSpecialties')
  })

  it('updates placeholder and max length when the council type is switched to CRN', () => {
    visitClinic('/professionals/new', mockAuthUser)

    cy.get('[data-testid="professional-form-registration-number-0"]')
      .should('have.attr', 'placeholder', '12345')
      .and('have.attr', 'maxlength', '6')

    cy.get('[data-testid="professional-form-registration-council-type-0"]').select('crn')

    cy.get('[data-testid="professional-form-registration-number-0"]')
      .should('have.attr', 'placeholder', '12345678')
      .and('have.attr', 'maxlength', '8')
  })

  it('hides the specialty section entirely for a CRN professional', () => {
    visitClinic('/professionals/new', mockAuthUser)
    cy.wait('@getSpecialties')

    cy.get('[data-testid="professional-form-specialty-group"]').should('be.visible')

    cy.get('[data-testid="professional-form-registration-council-type-0"]').select('crn')

    cy.get('[data-testid="professional-form-specialty-group"]').should('not.exist')
  })

  it('creates a CRN professional with the correct registration payload and no specialties', () => {
    cy.intercept('POST', `${Cypress.env('API_URL')}/professionals`, {
      statusCode: 201,
      body: mockCreatedProfessional,
    }).as('createProfessional')
    cy.intercept('GET', `${Cypress.env('API_URL')}/professionals*`, {
      statusCode: 200,
      body: { data: [mockCreatedProfessional], total: 1, page: 1, limit: 20 },
    }).as('getProfessionals')

    visitClinic('/professionals/new', mockAuthUser)
    cy.wait('@getSpecialties')

    cy.get('[data-testid="professional-form-user-mode-new"]').check()
    cy.get('[data-testid="professional-form-fullname"]').type('Ana Nutricionista')
    cy.get('[data-testid="professional-form-email"]').type('ana@test.com')

    cy.get('[data-testid="professional-form-registration-council-type-0"]').select('crn')
    cy.get('[data-testid="professional-form-registration-number-0"]').type('12345678')
    cy.get('[data-testid="professional-form-registration-state-0"]').select('SP')

    cy.get('[data-testid="professional-form-submit"]').click()

    cy.wait('@createProfessional').then((interception) => {
      expect(interception.request.body.registrations).to.deep.equal([
        { councilType: 'crn', number: '12345678', state: 'SP', isPrimary: true },
      ])
      expect(interception.request.body.specialties).to.deep.equal([])
    })
    expectClinicPath('/professionals')
  })

  it('shows a format validation error when the CRN number contains letters', () => {
    visitClinic('/professionals/new', mockAuthUser)

    // CRN requires digits only; the keystroke filter is permissive (shared across all
    // council types), so the final numberPattern check must catch this at submit time.
    cy.get('[data-testid="professional-form-registration-council-type-0"]').select('crn')
    cy.get('[data-testid="professional-form-registration-number-0"]').type('ABC')
    cy.get('[data-testid="professional-form-registration-state-0"]').select('SP')
    cy.get('[data-testid="professional-form-submit"]').click()

    cy.contains('Preencha número e UF de todos os registros no formato esperado').should('be.visible')
  })
})

export {}
