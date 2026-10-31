#!/usr/bin/env node
/**
 * Génère .claude/docs/TICKETS.md : l'état de toutes les issues GitHub, lu par les
 * agents au début de chaque cycle.
 *
 * GitHub reste la source de vérité. Ce fichier n'est qu'un instantané : il est
 * régénéré à chaque fois, jamais édité à la main, et n'est pas versionné (il
 * changerait sur chaque branche et provoquerait des conflits).
 *
 * Usage : node scripts/agents/tickets.mjs [chemin-de-sortie]
 * Prérequis : `gh` installé et authentifié.
 */
import { execFileSync } from 'node:child_process';
import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

import { STATUS_LABELS } from './naming.mjs';

const ROOT = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..', '..');
const OUTPUT = path.resolve(ROOT, process.argv[2] || '.claude/docs/TICKETS.md');
const RECENT_DAYS = 90;

const ISSUE_FIELDS = [
  'number',
  'title',
  'state',
  'stateReason',
  'labels',
  'milestone',
  'assignees',
  'createdAt',
  'closedAt',
  'closedByPullRequestsReferences',
];

const TYPES = {
  feature: 'Feature',
  enhancement: 'Enhancement',
  bug: 'Bug',
  'tech-debt': 'Tech-Debt',
  refactoring: 'Refactoring',
  documentation: 'Documentation',
  security: 'Security',
  tests: 'Tests',
  epic: 'Epic',
};

const PRIORITIES = [
  { label: 'high-priority', rank: 0, text: '🔴 Haute' },
  { label: 'medium-priority', rank: 1, text: '🟠 Moyenne' },
  { label: 'low-priority', rank: 2, text: '🟢 Basse' },
];

const SCOPES = ['backend', 'frontend', 'api', 'data', 'ux', 'ARCHI'];

const AGENT_STATES = STATUS_LABELS;

const ACTIVE_STATES = new Set([
  'human:takeover',
  'agent:blocked',
  'needs-human-approval',
  'agent:in-review',
  'agent:in-progress',
]);

function gh(args) {
  return JSON.parse(
    execFileSync('gh', args, { cwd: ROOT, encoding: 'utf8', maxBuffer: 64 * 1024 * 1024 }),
  );
}

const simsId = (n) => `SIMS-${String(n).padStart(3, '0')}`;
const day = (iso) => (iso ? iso.slice(0, 10) : '—');
const cell = (s) => String(s).replace(/\|/g, '\\|').replace(/\r?\n/g, ' ');

// Les anciens titres portent parfois un numéro SIMS faux (#91 titrée « SIMS-88 ») :
// on l'enlève et on affiche le numéro calculé. Le « [Type] » a sa propre colonne.
const cleanTitle = (title) =>
  title
    .replace(/^\s*SIMS-\d+\s*:?\s*/i, '')
    .replace(/^\[[^\]]+\]\s*/, '')
    .trim();

function describe(issue) {
  const labels = issue.labels.map((l) => l.name);
  const type = labels.map((l) => TYPES[l]).find(Boolean) || '—';
  const priority = PRIORITIES.find((p) => labels.includes(p.label));
  const scopes = labels.filter((l) => SCOPES.includes(l));
  const agentState = AGENT_STATES.find((s) => labels.includes(s.label));

  let status;
  if (issue.state === 'CLOSED') {
    if (labels.includes('duplicate')) status = '🔁 Doublon';
    else if (issue.stateReason === 'NOT_PLANNED') status = '🚫 Abandonné';
    else status = '✔️ Terminé';
  } else if (agentState) {
    status = agentState.text;
  } else if (labels.length === 0) {
    status = '🆕 À trier';
  } else {
    status = '📋 Ouvert';
  }

  return {
    ...issue,
    id: simsId(issue.number),
    shortTitle: cleanTitle(issue.title),
    type,
    priority: priority ? priority.text : '—',
    priorityRank: priority ? priority.rank : PRIORITIES.length,
    scopes: scopes.join(', ') || '—',
    status,
    active: labels.some((l) => ACTIVE_STATES.has(l)),
    prs:
      (issue.closedByPullRequestsReferences || []).map((pr) => `#${pr.number}`).join(', ') || '—',
    milestoneTitle: issue.milestone ? issue.milestone.title : '—',
    assignee: issue.assignees.map((a) => a.login).join(', ') || '—',
  };
}

function table(headers, rows) {
  if (rows.length === 0) return '_Aucune._\n';
  return (
    [
      `| ${headers.join(' | ')} |`,
      `| ${headers.map(() => '---').join(' | ')} |`,
      ...rows.map((r) => `| ${r.map(cell).join(' | ')} |`),
    ].join('\n') + '\n'
  );
}

function render(issues, milestones) {
  const now = new Date();
  const recentLimit = new Date(now.getTime() - RECENT_DAYS * 24 * 3600 * 1000);

  const open = issues.filter((i) => i.state === 'OPEN');
  const closed = issues.filter((i) => i.state === 'CLOSED');
  const active = open.filter((i) => i.active);
  const waiting = open
    .filter((i) => !i.active)
    .sort((a, b) => a.priorityRank - b.priorityRank || a.number - b.number);
  const recent = closed
    .filter((i) => new Date(i.closedAt) >= recentLimit)
    .sort((a, b) => b.closedAt.localeCompare(a.closedAt));
  const older = closed.filter((i) => new Date(i.closedAt) < recentLimit);

  const olderByMonth = {};
  for (const i of older) {
    const month = i.closedAt.slice(0, 7);
    olderByMonth[month] = (olderByMonth[month] || 0) + 1;
  }

  const out = [];
  out.push('# 🎫 Tickets');
  out.push('');
  out.push('> 🤖 **Fichier généré** par `npm run agents:tickets` — ne pas éditer, non versionné.');
  out.push('> Source de vérité : les issues GitHub.');
  out.push(`> Généré le **${now.toISOString().slice(0, 16).replace('T', ' ')} UTC**.`);
  out.push('');
  out.push(
    `**${open.length}** ouvertes (dont **${open.filter((i) => i.status === '🆕 À trier').length}** à trier, ` +
      `**${active.length}** en cours) · **${closed.length}** fermées.`,
  );
  out.push('');

  out.push('## Objectifs (milestones)');
  out.push('');
  out.push(
    table(
      ['Objectif', 'Échéance', 'Avancement', 'Ouvertes', 'Description'],
      milestones
        .filter((m) => m.state === 'open')
        .map((m) => {
          const total = m.open_issues + m.closed_issues;
          const pct = total ? Math.round((m.closed_issues / total) * 100) : 0;
          return [
            m.title,
            day(m.due_on),
            `${pct} % (${m.closed_issues}/${total})`,
            m.open_issues,
            m.description || '—',
          ];
        }),
    ),
  );

  out.push('## En cours');
  out.push('');
  out.push(
    table(
      ['Ticket', 'Titre', 'Statut', 'Assigné', 'Objectif'],
      active.map((i) => [
        `${i.id} (#${i.number})`,
        i.shortTitle,
        i.status,
        i.assignee,
        i.milestoneTitle,
      ]),
    ),
  );

  out.push('## Ouvertes');
  out.push('');
  out.push(
    table(
      ['Ticket', 'Type', 'Titre', 'Priorité', 'Périmètre', 'Statut', 'Objectif', 'Créée le'],
      waiting.map((i) => [
        `${i.id} (#${i.number})`,
        i.type,
        i.shortTitle,
        i.priority,
        i.scopes,
        i.status,
        i.milestoneTitle,
        day(i.createdAt),
      ]),
    ),
  );

  out.push(`## Fermées ces ${RECENT_DAYS} derniers jours`);
  out.push('');
  out.push(
    table(
      ['Ticket', 'Type', 'Titre', 'Statut', 'Créée le', 'Fermée le', 'PR'],
      recent.map((i) => [
        `${i.id} (#${i.number})`,
        i.type,
        i.shortTitle,
        i.status,
        day(i.createdAt),
        day(i.closedAt),
        i.prs,
      ]),
    ),
  );

  out.push('## Historique plus ancien');
  out.push('');
  out.push(
    `${older.length} issues fermées avant le ${day(recentLimit.toISOString())}. ` +
      'Détail : `gh issue list --state closed --search "closed:<AAAA-MM-JJ"`.',
  );
  out.push('');
  out.push(
    table(
      ['Mois', 'Fermées'],
      Object.keys(olderByMonth)
        .sort()
        .reverse()
        .map((m) => [m, olderByMonth[m]]),
    ),
  );

  return out.join('\n');
}

function main() {
  const issues = gh([
    'issue',
    'list',
    '--state',
    'all',
    '--limit',
    '5000',
    '--json',
    ISSUE_FIELDS.join(','),
  ]).map(describe);
  const milestones = gh(['api', 'repos/{owner}/{repo}/milestones?state=all&per_page=100']);

  fs.mkdirSync(path.dirname(OUTPUT), { recursive: true });
  fs.writeFileSync(OUTPUT, render(issues, milestones));
  console.log(
    `✅ ${path.relative(ROOT, OUTPUT)} — ${issues.length} issues, ${milestones.length} milestones.`,
  );
}

main();
