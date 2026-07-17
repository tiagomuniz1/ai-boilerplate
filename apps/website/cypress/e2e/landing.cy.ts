describe('Landing institucional', () => {
  beforeEach(() => {
    cy.visit('/')
  })

  it('loads the hero and navigates to sections via the navbar anchors', () => {
    cy.contains('h1', 'Gestão clínica com a confiança que a medicina exige.').should('be.visible')

    cy.contains('nav a', 'Recursos').click()
    cy.get('#recursos').should('be.visible')

    cy.contains('nav a', 'Segurança').click()
    cy.get('#seguranca').should('be.visible')

    cy.contains('nav a', 'Como funciona').click()
    cy.get('#como-funciona').should('be.visible')

    cy.contains('nav a', 'Perguntas').click()
    cy.get('#perguntas').should('be.visible')
  })

  it('expands and collapses a FAQ item', () => {
    cy.get('#perguntas').within(() => {
      cy.contains('button', 'Preciso instalar algo?').click()
      cy.contains('O Pulso é 100% web').should('be.visible')
      cy.contains('button', 'Preciso instalar algo?').click()
      cy.contains('O Pulso é 100% web').should('not.exist')
    })
  })

  it('opens and closes the access request modal from the hero CTA', () => {
    cy.get('[data-testid="hero-cta"]').click()
    cy.get('[data-testid="access-request-modal"]').should('be.visible')
    cy.get('[data-testid="access-request-close"]').click()
    cy.get('[data-testid="access-request-modal"]').should('not.exist')
  })

  it('submits an access request from the final CTA', () => {
    cy.intercept('POST', '**/access-requests', { statusCode: 201 }).as('createAccessRequest')

    cy.get('[data-testid="final-cta"]').click()
    cy.get('#fullName').type('Ana Costa')
    cy.get('#email').type('ana@clinica.com')
    cy.get('#clinicName').type('Clínica do Vale')
    cy.get('[data-testid="access-request-form"]').contains('button', 'Solicitar acesso').click()

    cy.wait('@createAccessRequest')
    cy.get('[data-testid="access-request-success"]').should('be.visible')
  })

  it('does not show a light/dark theme toggle', () => {
    cy.get('[data-testid="theme-toggle"]').should('not.exist')
  })

  it('does not render the testimonials section', () => {
    cy.get('[data-testid="testimonial-placeholder"]').should('not.exist')
  })

  it('opens a screenshot in a lightbox and closes it', () => {
    cy.get('[data-testid="screenshot-image-trigger"]').first().click()
    cy.get('[data-testid="image-lightbox"]').should('be.visible')
    cy.get('[data-testid="image-lightbox-close"]').click()
    cy.get('[data-testid="image-lightbox"]').should('not.exist')
  })
})
