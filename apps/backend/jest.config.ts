import type { Config } from 'jest'

const config: Config = {
  moduleFileExtensions: ['js', 'json', 'ts'],
  rootDir: 'src',
  testRegex: '^(?!.*\\.integration\\.spec\\.ts$).*\\.spec\\.ts$',
  transform: {
    '^.+\\.(t|j)s$': 'ts-jest',
  },
  collectCoverageFrom: [
    '**/*.(t|j)s',
    '!**/*.d.ts',
    '!**/*.module.ts',
    '!**/*.entity.ts',
    '!**/*.dto.ts',
    '!**/database.config.ts',
    '!**/migrations/**',
    '!**/seeds/**',
    '!**/main.ts',
    '!**/*.spec.ts',
  ],
  coverageDirectory: '../coverage',
  testEnvironment: 'node',
  moduleNameMapper: {
    '^@app/shared$': '<rootDir>/../../../packages/shared/src',
    '^@app/shared/(.*)$': '<rootDir>/../../../packages/shared/src/$1',
  },
}

export default config
