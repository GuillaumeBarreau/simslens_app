// initData : un échec d'initialisation doit être visible et bloquant (SIMS-155).
import { spawnSync } from 'node:child_process';
import path from 'node:path';

const { SEED_STEPS, runSeeds } = require('../initData');

const silent = { log: vi.fn() } as unknown as Console;

describe('runSeeds', () => {
  it('exécute toutes les étapes dans l’ordre', () => {
    const exec = vi.fn();
    expect(runSeeds({ scriptsPath: './src/scripts', exec, log: silent })).toEqual({ ok: true });
    expect(exec).toHaveBeenCalledTimes(SEED_STEPS.length);
    expect(exec.mock.calls[0][0]).toBe('node ./src/scripts/seed/seedItems.js');
  });

  it('s’arrête au premier échec et nomme l’étape', () => {
    const exec = vi
      .fn()
      .mockImplementationOnce(() => undefined)
      .mockImplementationOnce(() => {
        throw new Error('seedBonuses.js a échoué');
      });
    const result = runSeeds({ scriptsPath: './src/scripts', exec, log: silent });
    expect(result).toEqual({ ok: false, step: 'bonus data', error: 'seedBonuses.js a échoué' });
    expect(exec).toHaveBeenCalledTimes(2);
  });
});

describe('initData en ligne de commande', () => {
  it('sort avec le code 1 si une étape échoue', () => {
    // Lancé depuis un dossier sans scripts de seed : la première étape échoue.
    const script = path.resolve(__dirname, '..', 'initData.js');
    const run = spawnSync(process.execPath, [script], {
      cwd: path.resolve(__dirname),
      encoding: 'utf8',
    });
    expect(run.status).toBe(1);
    expect(run.stderr).toMatch(/étape « items »/);
  });
});
