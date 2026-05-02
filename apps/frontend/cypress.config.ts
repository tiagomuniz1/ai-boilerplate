import { defineConfig } from 'cypress'

export default defineConfig({
  e2e: {
    baseUrl: 'http://localhost:3000',
    supportFile: 'cypress/support/e2e.ts',
    specPattern: 'cypress/e2e/**/*.cy.{ts,tsx}',
    video: false,
    screenshotOnRunFailure: true,
    env: {
      API_URL: 'http://localhost:3001',
    },
    setupNodeEvents(on) {
      on('before:browser:launch', (browser, launchOptions) => {
        if (browser.family === 'chromium') {
          launchOptions.args.push('--disable-gpu')
          launchOptions.args.push('--disable-dev-shm-usage')
        }

        if (browser.name === 'electron') {
          launchOptions.args.push('--disable-gpu')
          launchOptions.args.push('--no-sandbox')
          launchOptions.args.push('--disable-dev-shm-usage')
          launchOptions.args.push('--disable-software-rasterizer')
          launchOptions.args.push('--disable-features=VizDisplayCompositor')
        }
        return launchOptions
      })
    },
  },
})
