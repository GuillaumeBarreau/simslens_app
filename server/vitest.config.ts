import { defineConfig } from 'vitest/config';

export default defineConfig({
  test: {
    environment: 'node',
    // Seuls les fichiers *.test.* sont des tests : __tests__/ contient aussi des données
    // (routeGuards.exceptions.ts) et des utilitaires (helpers/), qui ne doivent pas
    // compter comme des suites vides (SIMS-151).
    include: ['src/**/*.test.{js,ts}'],
    globals: true,
    restoreMocks: true,
    mockReset: true,
    clearMocks: true,
    // src/data.js appelle process.exit(1) si DATABASE_URL est absent, ce qui
    // rend intestable tout module important un repository. Cette URL factice
    // permet au client Prisma de s'initialiser ; aucun test ne s'y connecte.
    env: {
      DATABASE_URL: 'postgresql://test:test@127.0.0.1:5432/test',
    },
  },
});
