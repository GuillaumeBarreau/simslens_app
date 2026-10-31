/**
 * Utilitaires partagés par les scripts du système d'agents.
 * Aucune dépendance : Node ≥ 20 uniquement.
 */
import { execFileSync } from 'node:child_process';
import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

export const ROOT = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..', '..');
export const OUT_DIR = path.join(ROOT, '.agents-out');

const readJson = (rel) => JSON.parse(fs.readFileSync(path.join(ROOT, rel), 'utf8'));

export const loadConfig = () => readJson('scripts/agents/config.json');
export const loadProtectedPaths = () => readJson('scripts/agents/protected-paths.json').paths;

/**
 * Lit `.env.agents` (non versionné) sans l'injecter dans process.env : seules les
 * clés demandées sont exposées à l'appelant.
 */
export function readAgentsEnv() {
  const file = path.join(ROOT, '.env.agents');
  const env = {};
  if (!fs.existsSync(file)) return env;
  for (const line of fs.readFileSync(file, 'utf8').split(/\r?\n/)) {
    const m = line.match(/^\s*([A-Z0-9_]+)\s*=\s*(.*?)\s*$/);
    if (m) env[m[1]] = m[2].replace(/^(['"])(.*)\1$/, '$2');
  }
  return env;
}

/** Kill switch : fichier sentinelle ou AGENTS_ENABLED=false (§12.4). */
export function killSwitchActive() {
  if (fs.existsSync(path.join(ROOT, '.claude', 'agents.disabled')))
    return 'fichier .claude/agents.disabled présent';
  const enabled = process.env.AGENTS_ENABLED ?? readAgentsEnv().AGENTS_ENABLED;
  if (enabled && enabled.toLowerCase() === 'false') return 'AGENTS_ENABLED=false';
  return null;
}

/** Convertit un glob (**, *, ?) en RegExp ancrée, séparateurs normalisés en « / ». */
export function globToRegExp(glob) {
  let re = '';
  for (let i = 0; i < glob.length; i++) {
    const c = glob[i];
    if (c === '*' && glob[i + 1] === '*') {
      // « **/ » = zéro ou plusieurs dossiers ; « ** » final = tout
      if (glob[i + 2] === '/') {
        re += '(?:.*/)?';
        i += 2;
      } else {
        re += '.*';
        i += 1;
      }
    } else if (c === '*') re += '[^/]*';
    else if (c === '?') re += '[^/]';
    else re += c.replace(/[.+^${}()|[\]\\]/g, '\\$&');
  }
  return new RegExp(`^${re}$`, 'i');
}

/** Chemin relatif à la racine, en « / », ou null s'il sort du dépôt. */
export function toRepoPath(p) {
  if (!p) return null;
  const abs = path.isAbsolute(p) ? p : path.join(ROOT, p);
  const rel = path.relative(ROOT, abs);
  if (rel.startsWith('..') || path.isAbsolute(rel)) return null;
  return rel.split(path.sep).join('/');
}

/** Renvoie la règle protégée qui couvre ce chemin, ou null. */
export function matchProtected(repoPath, rules = loadProtectedPaths()) {
  if (!repoPath) return null;
  return rules.find((r) => globToRegExp(r.glob).test(repoPath)) || null;
}

export function git(args, opts = {}) {
  return execFileSync('git', args, {
    cwd: ROOT,
    encoding: 'utf8',
    // Un diff qui retire de gros fichiers de données (SIMS-284 : ~110 Mo) dépasse 64 Mo.
    maxBuffer: 512 * 1024 * 1024,
    ...opts,
  });
}

/**
 * Fichiers modifiés par rapport à la base : commits de la branche + modifications
 * non commitées + fichiers non suivis. Les suppressions sont renvoyées à part.
 */
export function changedFiles(base) {
  const lines = (s) =>
    s
      .split('\n')
      .map((l) => l.trim())
      .filter(Boolean);
  const mergeBase = git(['merge-base', base, 'HEAD']).trim();
  const status = lines(git(['diff', '--name-status', '--no-renames', mergeBase]));
  const untracked = lines(git(['ls-files', '--others', '--exclude-standard']));
  const changed = new Set(untracked);
  const deleted = new Set();
  for (const l of status) {
    const [st, file] = l.split('\t');
    if (st === 'D') deleted.add(file);
    else changed.add(file);
  }
  return { mergeBase, changed: [...changed].sort(), deleted: [...deleted].sort() };
}

export function ensureOutDir() {
  fs.mkdirSync(OUT_DIR, { recursive: true });
  return OUT_DIR;
}
