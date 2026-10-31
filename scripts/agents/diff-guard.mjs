#!/usr/bin/env node
/**
 * Analyse le diff de la branche courante et signale ce qui exige une validation
 * humaine :
 *   - chemins protégés touchés ;
 *   - PR trop grosse ;
 *   - tests affaiblis (supprimés, .skip/.only, assertions retirées, snapshots) ;
 *   - contournements ajoutés (eslint-disable, @ts-ignore…) ou config de qualité modifiée.
 *
 * Usage : node scripts/agents/diff-guard.mjs [--base origin/master] [--json]
 * Sortie : 0 = rien à signaler, 2 = validation humaine requise.
 */
import fs from 'node:fs';
import path from 'node:path';

import { changedFiles, git, loadConfig, matchProtected, ROOT } from './lib.mjs';

const args = process.argv.slice(2);
const config = loadConfig();
const base = args.includes('--base') ? args[args.indexOf('--base') + 1] : config.baseBranch;
const asJson = args.includes('--json');

const TEST_FILE = /(^|\/)(__tests__\/.*|test\.[cm]?[jt]sx?|.*\.(test|spec)\.[cm]?[jt]sx?)$/;
const QUALITY_CONFIG =
  /(^|\/)(\.eslintrc[^/]*|\.eslintignore|\.prettier(rc|ignore)[^/]*|vitest\.config\.[^/]+|vite\.config\.[^/]+|tsconfig[^/]*\.json|knip\.json)$/;
const FOCUS_OR_SKIP =
  /\b(?:(?:it|test|describe)\.(?:skip|only|todo)|xit|xdescribe|xtest|fit|fdescribe)\s*\(/;
const CODE_FILE = /\.[cm]?[jt]sx?$/;
// Directive placée dans un commentaire de code (eslint-disable, @ts-ignore…), pas une simple mention.
const BYPASS = /(?:\/\/|\/\*)\s*(?:eslint-disable|@ts-ignore|@ts-expect-error|@ts-nocheck)/;
const ASSERTION = /\bexpect\s*\(|\bassert[.(]/g;

/** Lignes ajoutées / retirées par fichier, à partir d'un diff unifié sans contexte. */
function parseDiff(diffText) {
  const files = {};
  let current = null;
  for (const line of diffText.split('\n')) {
    if (line.startsWith('+++ ')) {
      const p = line.slice(4).replace(/^b\//, '');
      current = p === '/dev/null' ? null : p;
      if (current) files[current] ??= { added: [], removed: [] };
    } else if (line.startsWith('--- ')) {
      const p = line.slice(4).replace(/^a\//, '');
      if (p !== '/dev/null') files[p] ??= { added: [], removed: [] };
      current = p === '/dev/null' ? null : p;
    } else if (current && line.startsWith('+')) files[current].added.push(line.slice(1));
    else if (current && line.startsWith('-')) files[current].removed.push(line.slice(1));
  }
  return files;
}

function main() {
  const { mergeBase, changed, deleted } = changedFiles(base);
  const diff = parseDiff(git(['diff', '-U0', '--no-renames', mergeBase]));

  // Fichiers non suivis : tout leur contenu est « ajouté ».
  const tracked = new Set(git(['ls-files']).split('\n'));
  for (const f of changed) {
    if (tracked.has(f) || diff[f]) continue;
    const abs = path.join(ROOT, f);
    if (!fs.existsSync(abs) || fs.statSync(abs).isDirectory()) continue;
    diff[f] = { added: fs.readFileSync(abs, 'utf8').split('\n'), removed: [] };
  }

  const findings = [];
  const add = (kind, file, detail) => findings.push({ kind, file, detail });

  // 1. Chemins protégés
  for (const f of [...changed, ...deleted]) {
    const rule = matchProtected(f);
    if (rule) add('chemin-protégé', f, rule.reason);
  }

  // 2. Taille
  const lines = Object.values(diff).reduce((n, d) => n + d.added.length + d.removed.length, 0);
  const fileCount = changed.length + deleted.length;
  if (lines > config.pr.maxChangedLines || fileCount > config.pr.maxChangedFiles) {
    add(
      'taille',
      '—',
      `${lines} lignes, ${fileCount} fichiers (max ${config.pr.maxChangedLines} / ${config.pr.maxChangedFiles})`,
    );
  }

  // 3. Tests affaiblis
  for (const f of deleted)
    if (TEST_FILE.test(f)) add('test-supprimé', f, 'fichier de test supprimé');
  for (const [f, d] of Object.entries(diff)) {
    const isAdded = changed.includes(f);
    if (
      (isAdded && f.includes('__snapshots__/')) ||
      d.added.some((l) => /toMatch(Inline)?Snapshot/.test(l))
    ) {
      add('snapshot', f, 'le projet n’utilise pas de snapshots');
    }
    if (TEST_FILE.test(f)) {
      if (d.added.some((l) => FOCUS_OR_SKIP.test(l)))
        add('test-désactivé', f, '.skip / .only / .todo ajouté');
      const count = (ls) => ls.reduce((n, l) => n + (l.match(ASSERTION) || []).length, 0);
      const before = count(d.removed);
      const after = count(d.added);
      if (after < before) add('assertions-retirées', f, `${before - after} assertion(s) en moins`);
    }
    if (CODE_FILE.test(f) && d.added.some((l) => BYPASS.test(l)))
      add('contournement', f, 'eslint-disable / @ts-ignore / @ts-expect-error ajouté');
    if (QUALITY_CONFIG.test(f))
      add('config-qualité', f, 'configuration lint / tests / types modifiée');
  }

  const result = { base, mergeBase, files: fileCount, lines, findings };
  if (asJson) {
    console.log(JSON.stringify(result, null, 2));
  } else if (findings.length === 0) {
    console.log(`✅ diff-guard : rien à signaler (${fileCount} fichiers, ${lines} lignes).`);
  } else {
    console.log(`✋ diff-guard : validation humaine requise (${findings.length} point(s)).`);
    for (const x of findings) console.log(`  - [${x.kind}] ${x.file} — ${x.detail}`);
  }
  process.exit(findings.length ? 2 : 0);
}

main();
