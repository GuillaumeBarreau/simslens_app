/**
 * Chaque fichier de routes monté dans app.js se charge sans erreur, comme au
 * démarrage du serveur (SIMS-130). Un handler `undefined` — par exemple une
 * fonction exportée après un `module.exports = { … }` qui l'écrase — fait lever
 * Express dès le chargement et empêche le serveur de démarrer.
 *
 * Les fichiers .ts de routes ne s'importent pas sous vitest : on les charge dans un
 * processus Node séparé, avec tsx, comme `npm run dev`.
 */
import { spawnSync } from 'node:child_process';
import path from 'node:path';
import { pathToFileURL } from 'node:url';

type Group = { module: string; file: string };
type Result = { file: string; ok: boolean; error: string | null };

const REPO = path.resolve(__dirname, '../../..');
const SERVER = path.join(REPO, 'server');

describe('chargement des routes', () => {
  it('chaque fichier de routes monté se charge comme au démarrage du serveur', async () => {
    const { inventory } = (await import(
      pathToFileURL(path.join(REPO, 'scripts', 'route-inventory.mjs')).href
    )) as { inventory: () => Group[] };
    const files = [...new Set(inventory().map((g) => path.join(REPO, g.file)))];
    expect(files.length).toBeGreaterThan(30);

    const run = spawnSync(
      process.execPath,
      ['--import', 'tsx', path.join(__dirname, 'helpers', 'loadRoutes.cjs'), ...files],
      { cwd: SERVER, encoding: 'utf8', timeout: 90_000 },
    );
    const lastLine = (run.stdout || '').trim().split('\n').pop() || '[]';
    let results: Result[];
    try {
      results = JSON.parse(lastLine);
    } catch {
      throw new Error(`Sortie illisible du chargeur :\n${run.stdout}\n${run.stderr}`);
    }

    const failures = results
      .filter((r) => !r.ok)
      .map((r) => `${path.relative(REPO, r.file)} : ${r.error}`);
    expect(failures).toEqual([]);
    expect(results).toHaveLength(files.length);
  }, 120_000);
});
