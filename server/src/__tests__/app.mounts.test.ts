// Le proxy /1/discord relayait au bot, sans authentification, des messages, des
// annonces et des créations de salon. Il n'avait aucun appelant et a été retiré
// (SIMS-118). app.js ne s'importe pas en test (connexions Redis / Discord au
// chargement) : on vérifie donc sa source.
import { existsSync, readFileSync } from 'node:fs';
import path from 'node:path';

const appSource = readFileSync(path.join(__dirname, '..', 'app.js'), 'utf8');

describe('montage des routes', () => {
  it('n’expose plus le proxy /1/discord', () => {
    expect(appSource).not.toMatch(/app\.use\(\s*['"]\/1\/discord['"]/);
    expect(existsSync(path.join(__dirname, '..', 'api', 'discord'))).toBe(false);
  });
});
