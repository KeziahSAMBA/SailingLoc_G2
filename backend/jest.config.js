export default {
  testEnvironment: 'node',
  transform: {},
  testMatch: ['**/tests/**/*.test.js'],
  collectCoverageFrom: ['src/**/*.js', '!src/server.js', '!src/scheduler.js', '!src/config/db.js'],
  coverageDirectory: 'coverage',
  coverageReporters: ['text', 'text-summary', 'lcov'],
  coverageThreshold: {
    global: {
      statements: 97,
      branches: 91,
      functions: 95,
      lines: 97,
    },
    './src/middlewares/': {
      statements: 100,
      branches: 100,
      functions: 100,
      lines: 100,
    },
    './src/jobs/handlers/': {
      statements: 91,
      branches: 65,
      functions: 85,
      lines: 92,
    },
  },
};
