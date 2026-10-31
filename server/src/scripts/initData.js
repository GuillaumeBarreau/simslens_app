const { execSync } = require('child_process');

/**
 * Initialise les données de référence en enchaînant les scripts de seed.
 *
 * S'arrête au premier échec et sort avec le code 1 (SIMS-155) : avant, l'erreur était
 * affichée mais le processus sortait en succès, et docker-entrypoint.sh poursuivait
 * le démarrage sur une base à moitié initialisée.
 */

/** Étapes, dans l'ordre : [libellé, script relatif au dossier des scripts]. */
const SEED_STEPS = [
  ['items', 'seed/seedItems.js'],
  ['bonus data', 'seed/seedBonuses.js'],
  ['classes', 'seed/seedClasses.js'],
  ['régions', 'seed/seedRegions.js'],
  ['serveurs', 'seed/seedServers.js'],
  ['difficulties', 'seed/seedDifficulties.js'],
  ['raids', 'seed/seedRaid.js'],
  ['difficulties pour le raid', 'seed/seedRaidDifficulties.js'],
  ['boss', 'seed/seedBoss.js'],
  ['tokens', 'seed/seedTokens.js'],
  ['enchantements', 'seed/seedEnchantments.js'],
  ['specializations', 'seed/seedSpecializations.js'],
  ['arbres de talents', 'seed/seedTalentTrees.js'],
  ['icônes de talents', 'seed/seedTalentIcons.js'],
];

/**
 * @param {{ scriptsPath: string, exec?: Function, log?: Console }} options
 * @returns {{ ok: true } | { ok: false, step: string, error: string }}
 */
function runSeeds({ scriptsPath, exec = execSync, log = console }) {
  for (const [label, script] of SEED_STEPS) {
    log.log(`Ajout des ${label}...`);
    try {
      exec(`node ${scriptsPath}/${script}`, { stdio: 'inherit' });
    } catch (err) {
      return { ok: false, step: label, error: err && err.message ? err.message : String(err) };
    }
  }
  return { ok: true };
}

function main() {
  const isDist = __dirname.includes('dist');
  const scriptsPath = isDist ? './dist/scripts' : './src/scripts';
  console.log(`Running initData from: ${isDist ? 'DIST' : 'SRC'}`);
  console.log(`Scripts Path: ${scriptsPath}`);
  console.log('Initialisation des données...');

  const result = runSeeds({ scriptsPath });
  if (result.ok) {
    console.log('Initialisation terminée.');
    return;
  }
  console.error(`Erreur lors de l'initialisation (étape « ${result.step} ») : ${result.error}`);
  process.exitCode = 1;
}

if (require.main === module) main();

module.exports = { SEED_STEPS, runSeeds };
