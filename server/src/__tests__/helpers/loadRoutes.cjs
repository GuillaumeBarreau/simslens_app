/**
 * Charge chaque fichier de routes passé en argument, comme le fait le serveur (sous
 * tsx), et affiche le résultat en JSON sur la dernière ligne. Utilisé par
 * routesLoad.test.ts (SIMS-130) : un handler `undefined` fait lever Express dès le
 * chargement (« argument handler must be a function »), ce que les tests vitest ne
 * voyaient pas, faute de pouvoir importer les routes .ts.
 *
 * Usage : node --import tsx loadRoutes.cjs <fichier> [<fichier> …]
 */
process.env.DATABASE_URL ||= 'postgresql://test:test@127.0.0.1:1/test';

const results = [];
for (const file of process.argv.slice(2)) {
  try {
    const mod = require(file);
    const router = mod && (mod.default || mod);
    const ok = typeof router === 'function' && Array.isArray(router.stack);
    results.push({ file, ok, error: ok ? null : 'le module n’exporte pas un routeur Express' });
  } catch (err) {
    results.push({ file, ok: false, error: String((err && err.message) || err) });
  }
}

process.stdout.write(`\n${JSON.stringify(results)}\n`);
// Des modules ouvrent Redis ou BullMQ au chargement : on sort sans attendre.
process.exit(0);
