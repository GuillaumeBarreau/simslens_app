#!/usr/bin/env node
/**
 * Vérification locale complète d'une branche.
 * Exécutée par `developer` avant d'ouvrir une PR, puis indépendamment par `qa`.
 *
 * Usage : node scripts/agents/verify.mjs [--base origin/master] [--skip-build]
 *
 * Étapes : Prettier (fichiers modifiés) · ESLint en cliquet (pas plus de problèmes
 * qu'avant dans chaque fichier modifié, zéro dans un nouveau fichier) · typecheck ·
 * tests des 3 workspaces · diff-guard · build de `app` si le front a changé.
 *
 * Sortie : 0 = vert · 1 = rouge · 2 = vert mais validation humaine requise.
 * Le résumé Markdown est écrit dans .agents-out/verify.md, à copier dans la PR.
 */
import { spawnSync } from 'node:child_process';
import fs from 'node:fs';
import path from 'node:path';

import { changedFiles, ensureOutDir, git, loadConfig, ROOT } from './lib.mjs';

const args = process.argv.slice(2);
const config = loadConfig();
const base = args.includes('--base') ? args[args.indexOf('--base') + 1] : config.baseBranch;
const skipBuild = args.includes('--skip-build');

const WORKSPACES = ['app', 'app_dashboard', 'server'];
const LINTABLE = /\.([cm]?js|jsx|ts|tsx)$/;
// Codes couleur ANSI, au cas où un outil ignore FORCE_COLOR=0.
const ANSI = new RegExp(`${String.fromCharCode(27)}\\[[0-9;]*m`, 'g');
const out = ensureOutDir();

function run(cmd, { cwd = ROOT, input } = {}) {
  const env = { ...process.env, FORCE_COLOR: '0', NO_COLOR: '1' };
  const r = spawnSync(cmd, {
    cwd,
    env,
    shell: true,
    encoding: 'utf8',
    input,
    maxBuffer: 256 * 1024 * 1024,
  });
  const plain = (t) => (t || '').replace(ANSI, '');
  return { code: r.status ?? 1, stdout: plain(r.stdout), stderr: plain(r.stderr) };
}
const tail = (s, n = 25) =>
  s
    .split('\n')
    .filter((l) => !/tailwindcss config path/.test(l))
    .slice(-n)
    .join('\n')
    .trim();
const quote = (f) => `"${f}"`;

const steps = [];
const step = (name, fn) => {
  const started = Date.now();
  let res;
  try {
    res = fn();
  } catch (e) {
    res = { status: 'ko', detail: e.message };
  }
  steps.push({ name, seconds: Math.round((Date.now() - started) / 1000), ...res });
  const icon = { ok: '✅', ko: '❌', warn: '⚠️', skip: '⏭', approval: '✋' }[res.status];
  console.log(`${icon} ${name}${res.detail ? ` — ${res.detail.split('\n')[0]}` : ''}`);
};

const { mergeBase, changed } = changedFiles(base);
const existing = changed.filter(
  (f) => fs.existsSync(path.join(ROOT, f)) && fs.statSync(path.join(ROOT, f)).isFile(),
);
const touches = (prefix) => existing.some((f) => f.startsWith(`${prefix}/`));
const rootConfigChanged = existing.some(
  (f) => !f.includes('/') && /tsconfig|eslintrc|package/.test(f),
);

console.log(
  `Base ${base} (${mergeBase.slice(0, 7)}) — ${existing.length} fichier(s) modifié(s).\n`,
);

step('Prettier (fichiers modifiés)', () => {
  if (!existing.length) return { status: 'skip' };
  const r = run(
    `npx --no-install prettier --check --ignore-unknown ${existing.map(quote).join(' ')}`,
  );
  if (r.code === 0) return { status: 'ok' };
  // Prettier écrit ses avertissements sur stderr.
  const bad = (r.stdout + r.stderr)
    .split('\n')
    .filter((l) => l.includes('[warn]') && !l.includes('Code style'))
    .map((l) => l.replace(/.*\[warn\]\s*/, ''));
  return {
    status: 'ko',
    detail: `${bad.length} fichier(s) à formater : npx prettier --write <fichier>`,
    output: bad.join('\n'),
  };
});

step('ESLint en cliquet (fichiers modifiés)', () => {
  const files = existing.filter((f) => LINTABLE.test(f));
  if (!files.length) return { status: 'skip' };
  const count = (json) => {
    try {
      return JSON.parse(json).reduce((n, r) => n + r.errorCount + r.warningCount, 0);
    } catch {
      return 0;
    }
  };
  // Config en cascade : chaque workspace a son .eslintrc (ex. server autorise require).
  const lint = 'npx --no-install eslint --ignore-path .eslintignore -f json';
  const regressions = [];
  for (const f of files) {
    const now = count(run(`${lint} ${quote(f)}`).stdout);
    let before = 0;
    try {
      const src = git(['show', `${mergeBase}:${f}`], { stdio: ['ignore', 'pipe', 'ignore'] });
      before = count(run(`${lint} --stdin --stdin-filename ${quote(f)}`, { input: src }).stdout);
    } catch {
      before = 0; // nouveau fichier : il doit être propre
    }
    if (now > before) regressions.push(`${f} : ${before} → ${now}`);
  }
  return regressions.length
    ? {
        status: 'ko',
        detail: `${regressions.length} fichier(s) avec plus de problèmes qu'avant`,
        output: regressions.join('\n'),
      }
    : { status: 'ok', detail: `${files.length} fichier(s), aucun nouveau problème` };
});

for (const ws of WORKSPACES) {
  step(`Typecheck ${ws}`, () => {
    if (!touches(ws) && !rootConfigChanged) return { status: 'skip', detail: 'non touché' };
    const r = run(`npx --no-install tsc --noEmit -p ${ws}/tsconfig.json`);
    return r.code === 0
      ? { status: 'ok' }
      : { status: 'ko', detail: 'erreurs de type', output: tail(r.stdout) };
  });
}

for (const ws of WORKSPACES) {
  step(`Tests ${ws}`, () => {
    const report = path.join(out, `vitest-${ws}.json`);
    fs.rmSync(report, { force: true });
    const r = run(`npx --no-install vitest run --reporter=json --outputFile=${quote(report)}`, {
      cwd: path.join(ROOT, ws),
    });
    if (!fs.existsSync(report))
      return {
        status: 'ko',
        detail: 'vitest n’a pas produit de rapport',
        output: tail(r.stdout + r.stderr),
      };
    const res = JSON.parse(fs.readFileSync(report, 'utf8'));
    const failedFiles = res.testResults
      .filter((t) => t.status === 'failed')
      .map((t) => path.relative(path.join(ROOT, ws), t.name).split(path.sep).join('/'));
    const known = config.knownTestFailures.filter((k) => k.workspace === ws).map((k) => k.file);
    const unexpected = failedFiles.filter((f) => !known.includes(f));
    const summary = `${res.numPassedTests}/${res.numTotalTests} tests`;
    if (unexpected.length)
      return {
        status: 'ko',
        detail: `${summary} — échecs : ${unexpected.join(', ')}`,
        output: tail(r.stdout + r.stderr),
      };
    if (failedFiles.length)
      return {
        status: 'warn',
        detail: `${summary} — échec connu toléré : ${failedFiles.join(', ')} (voir config.json)`,
      };
    return { status: 'ok', detail: summary };
  });
}

step('diff-guard', () => {
  const r = run(`node scripts/agents/diff-guard.mjs --base ${quote(base)}`);
  if (r.code === 0) return { status: 'ok' };
  if (r.code === 2)
    return { status: 'approval', detail: 'validation humaine requise', output: r.stdout.trim() };
  return { status: 'ko', detail: 'erreur', output: tail(r.stdout + r.stderr) };
});

step('Build app', () => {
  if (skipBuild) return { status: 'skip', detail: '--skip-build' };
  if (!touches('app') && !rootConfigChanged) return { status: 'skip', detail: 'front non touché' };
  const r = run('npm run build', { cwd: path.join(ROOT, 'app') });
  return r.code === 0
    ? { status: 'ok' }
    : { status: 'ko', detail: 'build en échec', output: tail(r.stdout + r.stderr) };
});

const failed = steps.some((s) => s.status === 'ko');
const approval = steps.some((s) => s.status === 'approval');
const verdict = failed ? '❌ Rouge' : approval ? '✋ Vert — validation humaine requise' : '✅ Vert';

const md = [
  `### Vérification locale — ${verdict}`,
  '',
  `Base \`${base}\` (\`${mergeBase.slice(0, 7)}\`), ${existing.length} fichier(s) modifié(s), ${new Date().toISOString().slice(0, 16).replace('T', ' ')} UTC.`,
  '',
  '| Étape | Résultat | Détail | Durée |',
  '| --- | --- | --- | --- |',
  ...steps.map(
    (s) =>
      `| ${s.name} | ${{ ok: '✅', ko: '❌', warn: '⚠️', skip: '⏭', approval: '✋' }[s.status]} | ${(s.detail || '').replace(/\|/g, '\\|')} | ${s.seconds}s |`,
  ),
  '',
  ...steps
    .filter((s) => s.output)
    .flatMap((s) => [
      `<details><summary>${s.name}</summary>`,
      '',
      '```',
      s.output,
      '```',
      '',
      '</details>',
      '',
    ]),
].join('\n');

fs.writeFileSync(path.join(out, 'verify.md'), md);
console.log(`\n${verdict} — résumé : .agents-out/verify.md`);
process.exit(failed ? 1 : approval ? 2 : 0);
