import type { Config } from 'jest'

const config: Config = {
  moduleFileExtensions: ['js', 'json', 'ts'],
  rootDir: 'src',
  testRegex: '.*\\.integration\\.spec\\.ts$',
  transform: {
    '^.+\\.(t|j)s$': 'ts-jest',
  },
  coverageDirectory: '../coverage-integration',
  testEnvironment: 'node',
  moduleNameMapper: {
    '^@app/shared$': '<rootDir>/../../../packages/shared/src',
    '^@app/shared/(.*)$': '<rootDir>/../../../packages/shared/src/$1',
  },
  globalSetup: '<rootDir>/database/seeds/test/test.seed.ts',
}

export default config
