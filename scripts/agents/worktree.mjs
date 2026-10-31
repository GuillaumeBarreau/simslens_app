#!/usr/bin/env node
/**
 * Worktrees de développement `../<dépôt>-SIMS-NNN` sur la branche `feat/SIMS-NNN`,
 * avec des junctions vers les node_modules du dépôt principal (pas d'installation).
 *
 * Suppression sûre : chaque lien est retiré seul (la cible n'est jamais parcourue), puis
 * on vérifie qu'il n'en reste aucun avant d'effacer le dossier. Un lien oublié ferait
 * effacer les node_modules du dépôt principal (incident du 2026-10-07).
 *
 * Usage : node scripts/agents/worktree.mjs create|remove <n° d'issue> [--keep-branch]
 */
import { execFileSync } from 'node:child_process';
import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

import { ROOT } from './lib.mjs';
import { branchName, simsId } from './naming.mjs';

/** Dossiers dont les node_modules sont partagés par junction. */
export const LINKED_DIRS = ['', 'app', 'server', 'app_dashboard', 'server_discord'];

/** Entrées de `.claude/` non copiées : permissions personnelles, worktrees, kill switch. */
const CLAUDE_SKIPPED = ['settings.local.json', 'worktrees', 'agents.disabled'];

export function worktreePath(issueNumber, root = ROOT) {
  return path.join(path.dirname(root), `${path.basename(root)}-${simsId(issueNumber)}`);
}

const git = (args, cwd) =>
  execFileSync('git', args, { cwd, encoding: 'utf8', stdio: ['ignore', 'pipe', 'pipe'] });

function isLink(p) {
  try {
    return fs.lstatSync(p).isSymbolicLink();
  } catch {
    return false;
  }
}

/** Liens (symlinks / junctions) sous `dir`, sans jamais les suivre. */
export function findLinks(dir) {
  const found = [];
  const walk = (d) => {
    let entries;
    try {
      entries = fs.readdirSync(d, { withFileTypes: true });
    } catch {
      return;
    }
    for (const e of entries) {
      const p = path.join(d, e.name);
      if (e.isSymbolicLink() || isLink(p)) found.push(p);
      else if (e.isDirectory() && e.name !== '.git') walk(p);
    }
  };
  walk(dir);
  return found;
}

/** Ajoute les junctions node_modules d'un worktree vers le dépôt principal. */
export function linkNodeModules(wt, root = ROOT) {
  for (const d of LINKED_DIRS) {
    const src = path.join(root, d, 'node_modules');
    const dst = path.join(wt, d, 'node_modules');
    if (fs.existsSync(src) && fs.existsSync(path.dirname(dst)) && !fs.existsSync(dst)) {
      fs.symlinkSync(src, dst, 'junction');
    }
  }
}

/** Retire les junctions node_modules (le lien seul) ; renvoie les liens restants. */
export function unlinkNodeModules(wt) {
  for (const d of LINKED_DIRS) {
    const dst = path.join(wt, d, 'node_modules');
    if (isLink(dst)) fs.unlinkSync(dst);
  }
  return findLinks(wt);
}

/**
 * Copie `.claude/` (agents, skills, hook guard.mjs) dans le worktree : ce dossier n'est
 * pas versionné, `git worktree add` ne l'apporte donc pas. Copie et non junction : rien
 * à retirer avant la suppression, et le dépôt principal reste hors d'atteinte.
 */
export function copyClaudeConfig(wt, root = ROOT) {
  const src = path.join(root, '.claude');
  if (!fs.existsSync(src)) return;
  fs.cpSync(src, path.join(wt, '.claude'), {
    recursive: true,
    filter: (p) => !CLAUDE_SKIPPED.includes(path.relative(src, p).split(path.sep)[0]),
  });
}

export function createWorktree(issueNumber, { root = ROOT, base = 'origin/master' } = {}) {
  const wt = worktreePath(issueNumber, root);
  if (fs.existsSync(wt)) throw new Error(`le worktree existe déjà : ${wt}`);
  const branch = branchName(issueNumber);
  const exists = git(['branch', '--list', branch], root).trim() !== '';
  git(exists ? ['worktree', 'add', wt, branch] : ['worktree', 'add', '-b', branch, wt, base], root);
  linkNodeModules(wt, root);
  copyClaudeConfig(wt, root);
  return { path: wt, branch };
}

export function removeWorktree(issueNumber, { root = ROOT, keepBranch = false } = {}) {
  const wt = worktreePath(issueNumber, root);
  if (fs.existsSync(wt)) {
    const left = unlinkNodeModules(wt);
    if (left.length) {
      throw new Error(`suppression refusée, liens restants :\n${left.join('\n')}`);
    }
    git(['worktree', 'remove', '--force', wt], root);
  }
  git(['worktree', 'prune'], root);
  if (!keepBranch) {
    const branch = branchName(issueNumber);
    if (git(['branch', '--list', branch], root).trim()) git(['branch', '-D', branch], root);
  }
  return { path: wt };
}

function main() {
  const [command, n] = process.argv.slice(2).filter((a) => !a.startsWith('--'));
  const issue = Number(n);
  try {
    if (command === 'create' && issue) console.log(`✅ ${createWorktree(issue).path}`);
    else if (command === 'remove' && issue)
      console.log(
        `🧹 ${removeWorktree(issue, { keepBranch: process.argv.includes('--keep-branch') }).path}`,
      );
    else {
      console.error('usage : worktree.mjs create|remove <n° d’issue> [--keep-branch]');
      process.exit(1);
    }
  } catch (err) {
    console.error(`❌ ${err.message}`);
    process.exit(1);
  }
}

if (process.argv[1] && path.resolve(process.argv[1]) === fileURLToPath(import.meta.url)) main();
