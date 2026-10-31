/**
 * Lancement de Claude Code en mode non interactif, partagé par le cycle
 * (run-cycle.mjs) et l'étape de développement (run-develop.mjs).
 *
 * Exécutable, dans l'ordre : CLAUDE_BIN (.env.agents), un `claude.exe` (ou `claude`
 * hors Windows) dans le PATH, sinon celui embarqué par l'extension VS Code (version la
 * plus récente), qui utilise la connexion de l'extension. Toujours lancé sans shell :
 * pas d'arguments concaténés.
 */
import { spawn, spawnSync } from 'node:child_process';
import fs from 'node:fs';
import os from 'node:os';
import path from 'node:path';

import { readAgentsEnv } from './lib.mjs';
import { formatEvent, splitJsonLines } from './stream-format.mjs';

/** Premier exécutable lançable sans shell trouvé dans le PATH, ou null. */
function claudeOnPath() {
  if (process.platform !== 'win32') {
    const r = spawnSync('claude', ['--version'], { encoding: 'utf8' });
    return r.status === 0 ? 'claude' : null;
  }
  // Sous Windows, un claude.cmd exigerait le shell : on ne retient qu'un .exe.
  const r = spawnSync('where.exe', ['claude'], { encoding: 'utf8' });
  if (r.status !== 0) return null;
  return (
    r.stdout
      .split(/\r?\n/)
      .map((l) => l.trim())
      .find((l) => /\.exe$/i.test(l)) || null
  );
}

export function findClaude() {
  const agentsEnv = readAgentsEnv();
  if (agentsEnv.CLAUDE_BIN) return agentsEnv.CLAUDE_BIN;
  const onPath = claudeOnPath();
  if (onPath) return onPath;
  const extDir = path.join(os.homedir(), '.vscode', 'extensions');
  if (!fs.existsSync(extDir)) return null;
  const exe = process.platform === 'win32' ? 'claude.exe' : 'claude';
  const version = (d) => (d.match(/(\d+)\.(\d+)\.(\d+)/) || []).slice(1).map(Number);
  const newest = fs
    .readdirSync(extDir)
    .filter((d) => d.startsWith('anthropic.claude-code-'))
    .map((d) => path.join(extDir, d, 'resources', 'native-binary', exe))
    .filter((p) => fs.existsSync(p))
    .sort((a, b) => {
      const [x, y] = [
        version(path.basename(path.dirname(path.dirname(path.dirname(a))))),
        version(path.basename(path.dirname(path.dirname(path.dirname(b))))),
      ];
      return y[0] - x[0] || y[1] - x[1] || y[2] - x[2];
    });
  return newest[0] || null;
}

/** true si l'exécutable répond à --version. */
export function claudeWorks(bin) {
  return Boolean(bin) && spawnSync(bin, ['--version'], { encoding: 'utf8' }).status === 0;
}

// Outils autorisés sans confirmation. Le garde (guard.mjs) reste le filet : il bloque
// ce qui est interdit même si c'est listé ici.
export const ALLOWED_TOOLS = [
  'Read',
  'Grep',
  'Glob',
  'Edit',
  'Write',
  'Agent',
  'Skill',
  'WebSearch',
  'WebFetch',
  'Bash(git status*)',
  'Bash(git diff*)',
  'Bash(git log*)',
  'Bash(git show*)',
  'Bash(git switch*)',
  'Bash(git add*)',
  'Bash(git commit*)',
  'Bash(git push*)',
  'Bash(git merge-base*)',
  'Bash(git ls-files*)',
  'Bash(git rev-list*)',
  'Bash(node scripts/agents/*)',
  // Commandes exactes : la forme « préfixe :* » ne correspond pas à « agents:tickets ».
  'Bash(npm run agents:tickets)',
  'Bash(npm run agents:verify)',
  'Bash(npm run agents:verify -- --skip-build)',
  'Bash(npm run agents:test)',
  'Bash(npm run docs)',
  'Bash(npm run deadcode*)',
  'Bash(npm audit*)',
  'Bash(npx eslint*)',
  'Bash(npx prettier*)',
  'Bash(npx tsc*)',
  'Bash(npx vitest*)',
  'Bash(gh issue list*)',
  'Bash(gh issue view*)',
  'Bash(gh pr list*)',
  'Bash(gh pr view*)',
  'Bash(gh pr diff*)',
  'Bash(gh search*)',
];

/**
 * Lance `claude -p <prompt>` et suit sa progression.
 * Écrit dans `outDir` : progress.log (lisible), claude.jsonl (brut), stderr.log,
 * result.md (dernière réponse). Résout avec { code, timedOut, totals }.
 */
export function runClaude({ bin, prompt, cwd, env, outDir, maxMinutes, echo = true }) {
  fs.mkdirSync(outDir, { recursive: true });
  const args = [
    '-p',
    prompt,
    '--permission-mode',
    'acceptEdits',
    '--allowedTools',
    ALLOWED_TOOLS.join(','),
    '--output-format',
    'stream-json',
    '--verbose',
  ];
  // stdin fermé : Claude n'attend pas d'entrée.
  const child = spawn(bin, args, {
    cwd,
    stdio: ['ignore', 'pipe', 'pipe'],
    env: { ...process.env, ...env },
  });
  const rawLog = fs.createWriteStream(path.join(outDir, 'claude.jsonl'));
  const progressLog = fs.createWriteStream(path.join(outDir, 'progress.log'), { flags: 'a' });
  const errLog = fs.createWriteStream(path.join(outDir, 'stderr.log'));
  child.stderr.pipe(errLog);

  let pending = '';
  const totals = { steps: 0, ms: 0, turns: 0, denials: 0 };
  child.stdout.setEncoding('utf8');
  child.stdout.on('data', (chunk) => {
    rawLog.write(chunk);
    const { events, rest } = splitJsonLines(pending + chunk);
    pending = rest;
    for (const event of events) {
      for (const line of formatEvent(event)) {
        if (echo) console.log(line);
        progressLog.write(`${line}\n`);
      }
      if (event.type === 'result') {
        totals.steps++;
        totals.ms += event.duration_ms || 0;
        totals.turns += event.num_turns || 0;
        totals.denials += (event.permission_denials || []).length;
        if (event.result) fs.writeFileSync(path.join(outDir, 'result.md'), event.result);
      }
    }
  });

  let timedOut = false;
  const timer = setTimeout(() => {
    timedOut = true;
    child.kill();
  }, maxMinutes * 60000);

  return new Promise((resolve) => {
    child.on('close', (code) => {
      clearTimeout(timer);
      rawLog.end();
      progressLog.end();
      resolve({ code, timedOut, totals });
    });
  });
}
