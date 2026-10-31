#!/usr/bin/env node
/**
 * Lance un cycle d'agents en mode non interactif.
 * C'est la commande que l'on planifie (Planificateur de tâches Windows, cron…).
 *
 * Usage : node scripts/agents/run-cycle.mjs [--dry-run]   (npm run agents:cycle)
 *
 * Avant de lancer Claude : kill switch, verrou (un seul cycle à la fois), quota de
 * cycles par jour, instantané des tickets. Pendant : AGENTS_MODE=1 (garde strict),
 * durée maximale, progression affichée en direct. Après : Discord en cas d'échec.
 *
 * Fichiers dans .agents-out/cycles/<id>/ :
 *   progress.log  progression lisible (suivie par `npm run agents:watch`)
 *   claude.jsonl  flux brut stream-json
 *   result.md     réponse finale du chef d'orchestre
 *   stderr.log    erreurs de Claude Code
 *
 * Exécutable Claude Code et outils autorisés : claude-runner.mjs.
 */
import { spawnSync } from 'node:child_process';
import fs from 'node:fs';
import path from 'node:path';

import { claudeWorks, findClaude, runClaude } from './claude-runner.mjs';
import { ensureOutDir, killSwitchActive, loadConfig, ROOT } from './lib.mjs';

const dryRun = process.argv.includes('--dry-run');
const config = loadConfig();
const claudeBin = findClaude();

const notify = (type, payload) =>
  spawnSync(process.execPath, [path.join(ROOT, 'scripts/agents/notify.mjs'), type, '-'], {
    input: JSON.stringify(payload),
    encoding: 'utf8',
    env: { ...process.env, AGENTS_CYCLE_ID: cycleId },
  });

const now = new Date();
const cycleId = now.toISOString().slice(0, 16).replace(':', 'h');
const cyclesDir = path.join(ensureOutDir(), 'cycles');
const cycleDir = path.join(cyclesDir, cycleId);
const lockFile = path.join(ensureOutDir(), 'cycle.lock');

function fail(message, { discord = true } = {}) {
  console.error(`❌ ${message}`);
  if (discord && !dryRun)
    notify('failure', { title: `Cycle ${cycleId} non lancé`, description: message });
  process.exit(1);
}

// 1. Kill switch
const killed = killSwitchActive();
if (killed) {
  console.log(`🛑 Kill switch actif (${killed}) : aucun cycle.`);
  process.exit(0);
}

// 2. Verrou — un cycle à la fois ; un verrou plus vieux que la durée max est périmé.
if (fs.existsSync(lockFile)) {
  const ageMin = (Date.now() - fs.statSync(lockFile).mtimeMs) / 60000;
  if (ageMin < config.budgets.cycleMaxMinutes + 5)
    fail(`un cycle est déjà en cours (${fs.readFileSync(lockFile, 'utf8')}).`, { discord: false });
  fs.rmSync(lockFile);
}

// 3. Quota quotidien
const today = cycleId.slice(0, 10);
const doneToday = fs.existsSync(cyclesDir)
  ? fs.readdirSync(cyclesDir).filter((d) => d.startsWith(today)).length
  : 0;
if (doneToday >= config.budgets.cyclesPerDay) {
  console.log(`⏸ Quota atteint : ${doneToday}/${config.budgets.cyclesPerDay} cycles aujourd'hui.`);
  process.exit(0);
}

// 4. Claude Code disponible ?
if (!claudeWorks(claudeBin)) {
  fail(
    `Claude Code introuvable${claudeBin ? ` (« ${claudeBin} »)` : ''} : ni CLAUDE_BIN dans .env.agents, ni \`claude\` dans le PATH, ni extension VS Code Claude Code.`,
    { discord: !dryRun },
  );
}

if (dryRun) {
  console.log(
    `Cycle ${cycleId} (${doneToday + 1}/${config.budgets.cyclesPerDay} aujourd'hui) — commande :`,
  );
  console.log(
    `AGENTS_MODE=1 AGENTS_CYCLE_ID=${cycleId} ${claudeBin} -p "/cycle ${cycleId}" (outils : claude-runner.mjs)`,
  );
  process.exit(0);
}

// 5. Instantané des tickets
fs.mkdirSync(cycleDir, { recursive: true });
fs.writeFileSync(lockFile, cycleId);
spawnSync(process.execPath, [path.join(ROOT, 'scripts/agents/tickets.mjs')], {
  cwd: ROOT,
  stdio: 'inherit',
});

// 6. Lancement, borné dans le temps.
console.log(
  `▶️ Cycle ${cycleId} lancé (max ${config.budgets.cycleMaxMinutes} min) — progression ci-dessous, aussi dans .agents-out/cycles/${cycleId}/progress.log (npm run agents:watch depuis un autre terminal)`,
);

const { code, timedOut, totals } = await runClaude({
  bin: claudeBin,
  prompt: `/cycle ${cycleId}`,
  cwd: ROOT,
  env: { AGENTS_MODE: '1', AGENTS_CYCLE_ID: cycleId },
  outDir: cycleDir,
  maxMinutes: config.budgets.cycleMaxMinutes,
});

if (timedOut) {
  notify('failure', {
    title: `Cycle ${cycleId} interrompu`,
    description: `Durée maximale de ${config.budgets.cycleMaxMinutes} min dépassée.`,
  });
}
const summary =
  `${new Date().toTimeString().slice(0, 8)} ${code === 0 ? '✅' : '❌'} Fin du cycle ${cycleId} — ` +
  `${Math.round(totals.ms / 60000)} min de travail, ${totals.turns} tours, ${totals.steps} étape(s), ` +
  `${totals.denials} appel(s) refusé(s)`;
console.log(summary);
fs.appendFileSync(
  path.join(cycleDir, 'progress.log'),
  `${summary}
`,
);
fs.rmSync(lockFile, { force: true });
if (code !== 0 && !timedOut) {
  notify('failure', {
    title: `Cycle ${cycleId} en échec`,
    description: `Claude Code s'est arrêté avec le code ${code}. Voir .agents-out/cycles/${cycleId}/stderr.log sur la machine du mainteneur.`,
  });
}
process.exit(code ?? 1);
