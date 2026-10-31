#!/usr/bin/env node
/**
 * Suit en direct la progression d'un cycle d'agents depuis un autre terminal.
 *
 * Usage : node scripts/agents/watch.mjs [identifiant-de-cycle]   (npm run agents:watch)
 * Sans identifiant : le cycle en cours, sinon le dernier.
 * Affiche .agents-out/cycles/<id>/progress.log puis les nouvelles lignes au fil de
 * l'eau ; s'arrête quand le cycle est terminé (Ctrl+C pour quitter avant).
 */
import fs from 'node:fs';
import path from 'node:path';

import { OUT_DIR } from './lib.mjs';

const cyclesDir = path.join(OUT_DIR, 'cycles');
const lockFile = path.join(OUT_DIR, 'cycle.lock');

function pickCycle() {
  if (process.argv[2]) return process.argv[2];
  if (fs.existsSync(lockFile)) return fs.readFileSync(lockFile, 'utf8').trim();
  if (!fs.existsSync(cyclesDir)) return null;
  return fs.readdirSync(cyclesDir).sort().pop() || null;
}

const cycleId = pickCycle();
if (!cycleId) {
  console.log('Aucun cycle trouvé dans .agents-out/cycles/.');
  process.exit(0);
}

const file = path.join(cyclesDir, cycleId, 'progress.log');
const running = () =>
  fs.existsSync(lockFile) && fs.readFileSync(lockFile, 'utf8').trim() === cycleId;

console.log(`Cycle ${cycleId}${running() ? ' (en cours)' : ' (terminé)'} — ${file}\n`);

let offset = 0;
function flush() {
  if (!fs.existsSync(file)) return;
  const size = fs.statSync(file).size;
  if (size <= offset) return;
  const fd = fs.openSync(file, 'r');
  const buf = Buffer.alloc(size - offset);
  fs.readSync(fd, buf, 0, buf.length, offset);
  fs.closeSync(fd);
  offset = size;
  process.stdout.write(buf.toString('utf8'));
}

flush();
if (!running()) {
  if (!fs.existsSync(file)) console.log('(pas de progress.log pour ce cycle)');
  process.exit(0);
}

const timer = setInterval(() => {
  flush();
  if (!running()) {
    flush();
    clearInterval(timer);
    console.log('\nCycle terminé.');
  }
}, 1000);
