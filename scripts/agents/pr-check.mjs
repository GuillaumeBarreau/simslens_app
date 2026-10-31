#!/usr/bin/env node
/**
 * Vérifie qu'une PR respecte les conventions (branche feat/SIMS-NNN, titre, Closes #N,
 * labels). Exécuté par la CI (pr-conventions.yml) ; utilisable en local sur une PR ouverte.
 *
 * Les PR externes (branche venue d'un fork) et celles de Dependabot ne peuvent ni nommer
 * leur branche ni poser de labels : pour elles, les écarts sont de simples avertissements
 * (résumé du job, code 0). Les PR internes restent bloquantes (code 1).
 *
 * Usage :
 *   node scripts/agents/pr-check.mjs <numéro-de-PR>         (lit la PR via gh)
 *   PR_BRANCH=… PR_TITLE=… PR_BODY=… PR_LABELS=a,b [PR_AUTHOR=…] \
 *     [PR_HEAD_REPO=owner/repo PR_BASE_REPO=owner/repo] node scripts/agents/pr-check.mjs
 */
import { execFileSync } from 'node:child_process';
import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

import { checkPullRequest } from './naming.mjs';

/** Identifiants de Dependabot selon la source (événement GitHub, `gh pr view`). */
export const DEPENDABOT_LOGINS = ['dependabot[bot]', 'app/dependabot', 'dependabot'];

/**
 * Origine d'une PR : « fork » (branche hors du dépôt de base), « dependabot » ou « internal ».
 * @param {{ headRepo?: string|null, baseRepo?: string|null, isCrossRepository?: boolean, author?: string }} pr
 */
export function prOrigin({ headRepo, baseRepo, isCrossRepository, author }) {
  if (isCrossRepository) return 'fork';
  // headRepo null : fork supprimé depuis l'ouverture de la PR. undefined : inconnu.
  if (baseRepo && headRepo !== undefined && headRepo?.toLowerCase() !== baseRepo.toLowerCase())
    return 'fork';
  if (DEPENDABOT_LOGINS.includes(author)) return 'dependabot';
  return 'internal';
}

/**
 * Résultat du contrôle : code de sortie et lignes à afficher.
 * @returns {{ code: 0|1, origin: string, problems: string[], lines: string[] }}
 */
export function evaluatePullRequest(pr) {
  const origin = prOrigin(pr);
  const problems = checkPullRequest(pr);
  if (problems.length === 0) {
    return { code: 0, origin, problems, lines: [`✅ PR conforme : ${pr.branch} — ${pr.title}`] };
  }
  const list = problems.map((p) => `  - ${p}`);
  if (origin === 'internal') {
    return {
      code: 1,
      origin,
      problems,
      lines: [`❌ PR non conforme (${problems.length}) :`, ...list],
    };
  }
  const who = origin === 'fork' ? 'PR externe (fork)' : 'PR Dependabot';
  return {
    code: 0,
    origin,
    problems,
    lines: [
      `⚠️ ${who} : conventions non bloquantes, à reprendre par un mainteneur (${problems.length}) :`,
      ...list,
    ],
  };
}

function fromGh(number) {
  const pr = JSON.parse(
    execFileSync(
      'gh',
      [
        'pr',
        'view',
        number,
        '--json',
        'headRefName,title,body,labels,author,isCrossRepository,headRepository,headRepositoryOwner',
      ],
      { encoding: 'utf8' },
    ),
  );
  const headRepo =
    pr.headRepository && pr.headRepositoryOwner
      ? `${pr.headRepositoryOwner.login}/${pr.headRepository.name}`
      : null;
  return {
    branch: pr.headRefName,
    title: pr.title,
    body: pr.body,
    labels: pr.labels.map((l) => l.name),
    author: pr.author?.login,
    isCrossRepository: pr.isCrossRepository,
    headRepo,
    baseRepo: process.env.GITHUB_REPOSITORY || null,
  };
}

function fromEnv() {
  return {
    branch: process.env.PR_BRANCH,
    title: process.env.PR_TITLE,
    body: process.env.PR_BODY || '',
    labels: (process.env.PR_LABELS || '')
      .split(',')
      .map((l) => l.trim())
      .filter(Boolean),
    author: process.env.PR_AUTHOR,
    headRepo: process.env.PR_HEAD_REPO,
    baseRepo: process.env.PR_BASE_REPO || null,
  };
}

function main() {
  const arg = process.argv[2];
  const result = evaluatePullRequest(arg ? fromGh(arg) : fromEnv());
  for (const line of result.lines) console.log(line);
  if (result.code === 0 && result.problems.length > 0) {
    console.log(`::warning::Conventions de PR non respectées (${result.origin}), non bloquant.`);
    if (process.env.GITHUB_STEP_SUMMARY) {
      fs.appendFileSync(process.env.GITHUB_STEP_SUMMARY, `${result.lines.join('\n')}\n`);
    }
  }
  process.exit(result.code);
}

if (process.argv[1] && path.resolve(process.argv[1]) === fileURLToPath(import.meta.url)) main();
