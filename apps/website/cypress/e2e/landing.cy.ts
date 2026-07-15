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

  it('toggles the content theme from the navbar', () => {
    // The initial theme follows the browser's prefers-color-scheme, so assert the toggle
    // flips the state relative to wherever it started rather than a fixed value.
    cy.get('html').then(($html) => {
      const startedDark = $html.hasClass('dark')
      cy.get('[data-testid="theme-toggle"]').click()
      cy.get('html').should(startedDark ? 'not.have.class' : 'have.class', 'dark')
      cy.get('[data-testid="theme-toggle"]').click()
      cy.get('html').should(startedDark ? 'have.class' : 'not.have.class', 'dark')
    })
  })

  it('expands and collapses a FAQ item', () => {
    cy.get('#perguntas').within(() => {
      cy.contains('button', 'Preciso instalar algo?').click()
      cy.contains('O Pulso é 100% web').should('be.visible')
      cy.contains('button', 'Preciso instalar algo?').click()
      cy.contains('O Pulso é 100% web').should('not.exist')
    })
  })

  it('points the primary CTAs at the register flow', () => {
    cy.get('[data-testid="hero-cta"]').should('have.attr', 'href').and('include', 'pulso.center')
    cy.get('[data-testid="final-cta"]').should('have.attr', 'href').and('include', 'pulso.center')
  })
})
