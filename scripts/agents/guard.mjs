#!/usr/bin/env node
/**
 * Hook PreToolUse de Claude Code.
 * Lit l'appel d'outil sur stdin ; sort en 2 avec un message sur stderr pour le bloquer.
 *
 * Deux modes :
 *   - base (toute session, y compris celles du mainteneur) : bloque seulement
 *     l'irréversible — reset de base, push forcé, déploiement, release ;
 *   - agents (AGENTS_MODE=1, posé par le lancement d'un cycle) : en plus, kill
 *     switch, chemins protégés, push hors `feat/SIMS-NNN`, écritures GitHub directes.
 *
 * En cas d'erreur interne : bloque en mode agents (fail closed), laisse passer
 * en mode base pour ne pas gêner le travail du mainteneur.
 */
import { execFileSync } from 'node:child_process';
import fs from 'node:fs';
import path from 'node:path';

import { killSwitchActive, matchProtected, ROOT } from './lib.mjs';

// Mode strict : variable posée par run-cycle.mjs, ou option --agent du hook déclaré dans
// chaque .claude/agents/*.md (les sous-agents sont donc stricts même lancés depuis VS Code).
const AGENT_MODE = process.env.AGENTS_MODE === '1' || process.argv.includes('--agent');
// Option du hook déclaré dans .claude/agents/qa.md : écritures limitées aux tests.
const TESTS_ONLY = process.argv.includes('--tests-only');
const TEST_FILE = /(^|\/)(__tests__\/.*|test\.[cm]?[jt]sx?|.*\.(test|spec)\.[cm]?[jt]sx?)$/;

/**
 * Chemin relatif à la racine du dépôt *ou du worktree* dans lequel l'agent travaille
 * (un `developer` isolé écrit dans .claude/worktrees/<nom>/…), ou null s'il en sort.
 */
function repoRelative(target, cwd) {
  let top = ROOT;
  try {
    top = execFileSync('git', ['rev-parse', '--show-toplevel'], {
      cwd: cwd && fs.existsSync(cwd) ? cwd : ROOT,
      encoding: 'utf8',
      stdio: ['ignore', 'pipe', 'ignore'],
    }).trim();
  } catch {
    /* hors dépôt git : on garde ROOT */
  }
  const abs = path.resolve(cwd || ROOT, target);
  for (const base of [top, ROOT]) {
    let rel = path.relative(base, abs);
    if (rel.startsWith('..') || path.isAbsolute(rel)) continue;
    rel = rel.split(path.sep).join('/');
    const wt = rel.match(/^\.claude\/worktrees\/[^/]+\/(.*)$/);
    return wt ? wt[1] : rel;
  }
  return null;
}

/** Interdit dans toutes les sessions. */
const ALWAYS = [
  [
    /\bprisma\s+migrate\s+reset\b|\bprisma:migrate:reset\b|\bdb:reset\b/,
    'reset de la base (destructif)',
  ],
  [/\bprisma\s+db\s+push\b|\bprisma:push\b/, '`prisma db push` contourne les migrations'],
  [/\bgit\s+push\b[^;&|]*\s(--force(?!-with-lease)|-f\b|--mirror)/, 'push forcé'],
  [/\bgit\s+push\b[^;&|]*(--delete\s+|\s:)(master|main)\b/, 'suppression de branche principale'],
  [
    /\bdeployment[\\/][^\s]*\.(sh|ps1)\b|\bdeploy\.(sh|ps1)\b/,
    'déploiement : réservé au mainteneur',
  ],
  [
    /\bgh\s+release\b|\bgit\s+tag\s+[^-\s]*v\d|\bgit\s+push\b[^;&|]*--tags/,
    'release / tag de version : réservé au mainteneur',
  ],
  [
    /\bstart:server:migrate\b|\bprisma\s+migrate\s+deploy\b|\bprisma:migrate:deploy\b/,
    'migration de base hors flux de dev',
  ],
];

/** Interdit en plus aux agents. */
const AGENT_ONLY = [
  [
    /\bgit\s+push\b(?![^;&|]*\sfeat\/SIMS-\d{3,}(?=$|[\s;&|]))/,
    'les agents ne poussent que sur leur branche feat/SIMS-<n° sur 3 chiffres>',
  ],
  [/\bgit\s+push\b[^;&|]*\b(master|main)\b/, 'push vers la branche principale'],
  [/--no-verify\b/, 'contournement des hooks git'],
  [
    /\bgit\s+(reset\s+--hard|clean\s+-[a-z]*f|checkout\s+--\s|restore\s+--source)/,
    'commande git destructive',
  ],
  [/\bgit\s+(tag|rebase|filter-branch|update-ref|config)\b/, 'commande git réservée au mainteneur'],
  [
    /\brm\s+-[a-z]*r[a-z]*f|\brm\s+-[a-z]*f[a-z]*r|\bRemove-Item\b[^;&|]*-Recurse/i,
    'suppression récursive',
  ],
  [
    /\bgh\s+(pr\s+(merge|close|create|edit|comment|review|ready)|issue\s+(create|edit|close|delete|comment|transfer|lock)|label|milestone|repo|secret|variable|workflow|run|ruleset|api)\b/,
    'écriture GitHub directe : passer par scripts/agents/gh.mjs (pas encore autorisé au niveau N0)',
  ],
  [
    /\bdocker(-compose|\s+compose)?\b[^;&|]*(--env-file\s+\.env\b(?!\.)|docker-compose\.yml)/,
    'Docker avec la configuration de production',
  ],
  [
    /\bnpm\s+(install|i|uninstall|update|add)\b|\bnpx\s+npm-check-updates\b/,
    'modification des dépendances : validation humaine',
  ],
  [/discord(app)?\.com\/api\/webhooks/i, 'webhook Discord : passer par scripts/agents/notify.mjs'],
  [
    /(?:^|[\s'"=/\\])\.env(?!\.agents\.example|\.example|\.production\.template)(?:\.[\w-]+)?(?=$|[\s'";|&)])/,
    'fichier .env : interdit aux agents',
  ],
];

const WRITE_TOOLS = new Set(['Edit', 'Write', 'MultiEdit', 'NotebookEdit']);

function block(reason) {
  process.stderr.write(
    `⛔ Bloqué par scripts/agents/guard.mjs (${AGENT_MODE ? 'mode agents' : 'mode base'}) : ${reason}\n`,
  );
  process.exit(2);
}

function check(input) {
  const tool = input.tool_name;
  const args = input.tool_input || {};

  if (AGENT_MODE) {
    const killed = killSwitchActive();
    if (killed) block(`kill switch actif (${killed})`);
  }

  if (tool === 'Bash' || tool === 'PowerShell') {
    const cmd = String(args.command || '');
    for (const [re, why] of ALWAYS) if (re.test(cmd)) block(why);
    if (AGENT_MODE) for (const [re, why] of AGENT_ONLY) if (re.test(cmd)) block(why);
    return;
  }

  if ((AGENT_MODE || TESTS_ONLY) && WRITE_TOOLS.has(tool)) {
    const target = args.file_path || args.notebook_path;
    if (!target) return;
    const repoPath = repoRelative(target, input.cwd);
    if (!repoPath) block(`écriture hors du dépôt : ${target}`);
    if (TESTS_ONLY && !TEST_FILE.test(repoPath) && !repoPath.startsWith('.agents-out/')) {
      block(`l'agent qa n'écrit que des fichiers de test (« ${repoPath} » refusé)`);
    }
    const rule = matchProtected(repoPath);
    if (rule)
      block(
        `chemin protégé « ${repoPath} » (${rule.reason}) — à proposer dans l'issue, un humain s'en charge`,
      );
  }
}

try {
  const raw = fs.readFileSync(0, 'utf8');
  check(raw.trim() ? JSON.parse(raw) : {});
  process.exit(0);
} catch (e) {
  if (AGENT_MODE) block(`erreur interne du garde (${e.message}) — blocage par précaution`);
  process.exit(0);
}
