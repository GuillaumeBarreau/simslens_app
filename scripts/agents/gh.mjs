#!/usr/bin/env node
/**
 * Seul accès des agents en écriture à GitHub.
 * Le garde interdit `gh issue create` & co. aux agents ; ce script, lui, applique les
 * règles : niveau d'autonomie, format SIMS, labels, assignation, quotas, doublons.
 *
 * Usage :
 *   node scripts/agents/gh.mjs create-issue <payload.json> [--dry-run]
 *   node scripts/agents/gh.mjs comment <n° d'issue> <fichier.md> [--dry-run]
 *   node scripts/agents/gh.mjs milestone-from-issue <n° d'issue> [--dry-run]
 *
 * payload.json (create-issue) :
 *   { "kind": "issue", "category": "bug", "type": "Security", "title": "…",
 *     "body": "…", "scopes": ["backend"], "priority": "high-priority" }
 *   { "kind": "objective", "title": "…", "body": "… Échéance : 2026-12-02 …",
 *     "priority": "medium-priority" }
 *
 * Sortie : une ligne JSON { ok, number, url, title } (ou { ok: false, error }).
 */
import { execFileSync } from 'node:child_process';
import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

import { ensureOutDir, killSwitchActive, loadConfig, ROOT } from './lib.mjs';
import { PRIORITY_LABELS, SCOPE_LABELS, simsId, TYPE_LABELS, TYPES } from './naming.mjs';

const AGENT_LABELS = ['agent:pending', 'agent:authored'];
const MAX_TITLE = 120;

// ---------------------------------------------------------------- fonctions pures

/** Lit le tableau « Niveau actuel » d'AUTONOMY.md → { catégorie: { level, cap } }. */
export function parseAutonomy(markdown) {
  const levels = {};
  for (const m of markdown.matchAll(/^\|\s*`([\w-]+)`\s*\|\s*N(\d)\s*\|\s*N(\d)\s*\|/gm)) {
    levels[m[1]] = { level: Number(m[2]), cap: Number(m[3]) };
  }
  return levels;
}

/** Titre sans préfixe SIMS ni [Type], pour comparer les doublons. */
export function normalizeTitle(title) {
  return String(title || '')
    .replace(/^\s*SIMS-\d+\s*:?\s*/i, '')
    .replace(/^\[[^\]]+\]\s*/, '')
    .replace(/\s+/g, ' ')
    .trim()
    .toLowerCase();
}

/** Problèmes d'un payload create-issue (vide = valide). */
export function validatePayload(p, autonomy) {
  const errors = [];
  if (!p || typeof p !== 'object') return ['payload absent ou illisible'];
  const kind = p.kind || 'issue';
  if (!['issue', 'objective'].includes(kind)) errors.push(`kind inconnu : ${kind}`);
  const category = kind === 'objective' ? 'objective' : p.category;
  const level = autonomy[category];
  if (!level) errors.push(`catégorie inconnue dans AUTONOMY.md : ${category}`);
  else if (level.level < 1)
    errors.push(
      `catégorie « ${category} » au niveau N${level.level} : il faut N1 pour créer une issue`,
    );

  const title = String(p.title || '').trim();
  if (!title) errors.push('title manquant');
  if (title.length > MAX_TITLE) errors.push(`title trop long (${title.length} > ${MAX_TITLE})`);
  if (/^\s*SIMS-\d+/i.test(title) || /^\s*\[/.test(title)) {
    errors.push('title sans préfixe SIMS ni [Type] : ils sont ajoutés par gh.mjs');
  }
  if (!String(p.body || '').trim()) errors.push('body manquant');
  if (p.priority && !PRIORITY_LABELS.includes(p.priority))
    errors.push(`priorité inconnue : ${p.priority}`);

  if (kind === 'issue') {
    if (!TYPES.includes(p.type))
      errors.push(`type inconnu : ${p.type} (attendu : ${TYPES.join(', ')})`);
    const scopes = Array.isArray(p.scopes) ? p.scopes : [];
    if (!scopes.length) errors.push('au moins un périmètre requis (scopes)');
    for (const s of scopes) if (!SCOPE_LABELS.includes(s)) errors.push(`périmètre inconnu : ${s}`);
    if (!p.priority) errors.push('priorité requise');
  }
  return errors;
}

/** Labels à poser sur l'issue. */
export function labelsFor(p) {
  if ((p.kind || 'issue') === 'objective') {
    return ['objective', p.priority || 'medium-priority', ...AGENT_LABELS];
  }
  return [TYPE_LABELS[p.type], ...p.scopes, p.priority, ...AGENT_LABELS];
}

/** Titre définitif, une fois le numéro connu. */
export function finalTitle(number, p) {
  const tag = (p.kind || 'issue') === 'objective' ? 'Objectif' : p.type;
  return `${simsId(number)} : [${tag}] ${String(p.title).trim()}`;
}

/** Échéance « AAAA-MM-JJ » trouvée dans le corps d'un objectif, ou null. */
export function dueDateFrom(body) {
  const m = String(body || '').match(/[ÉE]ch[ée]ance[^\d\n]{0,40}(\d{4}-\d{2}-\d{2})/i);
  return m ? m[1] : null;
}

// ------------------------------------------------------------------ accès GitHub

function gh(args, { input } = {}) {
  return execFileSync('gh', args, {
    cwd: ROOT,
    encoding: 'utf8',
    input,
    maxBuffer: 32 * 1024 * 1024,
  });
}
const ghJson = (args) => JSON.parse(gh(args));

// --------------------------------------------------------------------- quotas

function quotaFile() {
  const bucket = process.env.AGENTS_CYCLE_ID || `manuel-${new Date().toISOString().slice(0, 10)}`;
  return path.join(ensureOutDir(), `gh-${bucket.replace(/[^\w-]/g, '_')}.json`);
}
function readQuota() {
  const f = quotaFile();
  return fs.existsSync(f)
    ? JSON.parse(fs.readFileSync(f, 'utf8'))
    : { issues: 0, objectives: 0, comments: 0 };
}
function bumpQuota(key) {
  const q = readQuota();
  q[key] = (q[key] || 0) + 1;
  fs.writeFileSync(quotaFile(), JSON.stringify(q));
}

// ------------------------------------------------------------------- commandes

function createIssue(payloadFile, dryRun) {
  const config = loadConfig();
  const p = JSON.parse(fs.readFileSync(path.resolve(payloadFile), 'utf8'));
  const autonomy = parseAutonomy(
    fs.readFileSync(path.join(ROOT, '.claude/docs/AUTONOMY.md'), 'utf8'),
  );
  const errors = validatePayload(p, autonomy);
  if (errors.length) return { ok: false, error: errors.join(' ; ') };

  const isObjective = (p.kind || 'issue') === 'objective';
  const q = readQuota();
  if (isObjective && q.objectives >= config.quotas.objectiveProposalsPerCycle) {
    return {
      ok: false,
      error: `quota d'objectifs du cycle atteint (${config.quotas.objectiveProposalsPerCycle})`,
    };
  }
  if (!isObjective && q.issues >= config.quotas.issuesPerCycle) {
    return {
      ok: false,
      error: `quota d'issues du cycle atteint (${config.quotas.issuesPerCycle})`,
    };
  }

  const pending = ghJson([
    'issue',
    'list',
    '--label',
    'agent:pending',
    '--state',
    'open',
    '--limit',
    '200',
    '--json',
    'number',
  ]);
  if (pending.length >= config.quotas.maxPendingProposals) {
    return {
      ok: false,
      error: `${pending.length} propositions en attente de triage (max ${config.quotas.maxPendingProposals})`,
    };
  }

  const wanted = normalizeTitle(p.title);
  const similar = ghJson([
    'issue',
    'list',
    '--state',
    'all',
    '--limit',
    '30',
    '--search',
    `${p.title} in:title`,
    '--json',
    'number,title',
  ]);
  const dup = similar.find((i) => normalizeTitle(i.title) === wanted);
  if (dup) return { ok: false, error: `doublon : #${dup.number} « ${dup.title} »` };

  const labels = labelsFor(p);
  if (dryRun)
    return {
      ok: true,
      dryRun: true,
      title: finalTitle('???', p),
      labels,
      assignee: config.maintainer,
    };

  const bodyFile = path.join(ensureOutDir(), `gh-body-${Date.now()}.md`);
  const footer = `\n\n---\n🤖 Proposé par le système d'agents${process.env.AGENTS_CYCLE_ID ? ` (cycle ${process.env.AGENTS_CYCLE_ID})` : ''}.\n\n⏳ En attente de ta décision : remplace \`agent:pending\` par \`agent:approved\` (développée à l'étape 3, \`npm run agents:develop\`) ou par \`agent:rejected\` (fermée à l'étape 3).`;
  fs.writeFileSync(bodyFile, String(p.body).trim() + footer);
  const args = ['issue', 'create', '--title', p.title.trim(), '--body-file', bodyFile];
  for (const l of labels) args.push('--label', l);
  if (config.maintainer) args.push('--assignee', config.maintainer);
  const url = gh(args).trim();
  fs.rmSync(bodyFile, { force: true });

  const number = Number(url.split('/').pop());
  const title = finalTitle(number, p);
  gh(['issue', 'edit', String(number), '--title', title]);
  bumpQuota(isObjective ? 'objectives' : 'issues');
  return { ok: true, number, url, title };
}

function comment(issueNumber, file, dryRun) {
  const config = loadConfig();
  const q = readQuota();
  if (q.comments >= config.quotas.commentsPerCycle) {
    return {
      ok: false,
      error: `quota de commentaires du cycle atteint (${config.quotas.commentsPerCycle})`,
    };
  }
  const text = fs.readFileSync(path.resolve(file), 'utf8').trim();
  if (!text) return { ok: false, error: 'commentaire vide' };
  const issue = ghJson(['issue', 'view', String(issueNumber), '--json', 'number,state,labels']);
  if (issue.labels.some((l) => l.name === 'human:takeover')) {
    return {
      ok: false,
      error: `#${issueNumber} porte human:takeover : les agents n'y touchent plus`,
    };
  }
  const body = `🤖 **Proposition d'agent**${process.env.AGENTS_CYCLE_ID ? ` (cycle ${process.env.AGENTS_CYCLE_ID})` : ''}\n\n${text}`;
  if (dryRun) return { ok: true, dryRun: true, issue: issueNumber, body };
  gh(['issue', 'comment', String(issueNumber), '--body-file', '-'], { input: body });
  bumpQuota('comments');
  return { ok: true, issue: issueNumber };
}

function milestoneFromIssue(issueNumber, dryRun) {
  const issue = ghJson([
    'issue',
    'view',
    String(issueNumber),
    '--json',
    'number,title,body,state,labels,url',
  ]);
  const labels = issue.labels.map((l) => l.name);
  if (issue.state !== 'OPEN') return { ok: false, error: `#${issueNumber} n'est pas ouverte` };
  if (!labels.includes('objective'))
    return { ok: false, error: `#${issueNumber} n'est pas un objectif` };
  if (!labels.includes('agent:approved')) {
    return {
      ok: false,
      error: `#${issueNumber} n'est pas acceptée (label agent:approved posé par le mainteneur)`,
    };
  }
  const title = issue.title.replace(/^\s*SIMS-\d+\s*:\s*\[Objectif\]\s*/i, '').trim();
  const due = dueDateFrom(issue.body);
  const description = `${issue.body.split('\n---\n')[0].trim().slice(0, 900)}\n\nObjectif accepté : ${issue.url}`;
  if (dryRun) return { ok: true, dryRun: true, milestone: title, due };

  const args = [
    'api',
    '-X',
    'POST',
    'repos/{owner}/{repo}/milestones',
    '-f',
    `title=${title}`,
    '-f',
    `description=${description}`,
  ];
  if (due) args.push('-f', `due_on=${due}T23:59:59Z`);
  const milestone = JSON.parse(gh(args));
  gh([
    'issue',
    'comment',
    String(issueNumber),
    '--body',
    `🤖 Milestone créé : ${milestone.html_url}`,
  ]);
  gh(['issue', 'close', String(issueNumber), '--reason', 'completed']);
  return { ok: true, milestone: milestone.number, url: milestone.html_url, title };
}

// ------------------------------------------------------------------------ main

function main() {
  const [command, a, b] = process.argv.slice(2).filter((x) => !x.startsWith('--'));
  const dryRun = process.argv.includes('--dry-run');
  let result;
  try {
    const killed = killSwitchActive();
    if (killed) result = { ok: false, error: `kill switch actif (${killed})` };
    else if (command === 'create-issue' && a) result = createIssue(a, dryRun);
    else if (command === 'comment' && a && b) result = comment(a, b, dryRun);
    else if (command === 'milestone-from-issue' && a) result = milestoneFromIssue(a, dryRun);
    else
      result = {
        ok: false,
        error:
          'usage : create-issue <payload.json> | comment <n°> <fichier> | milestone-from-issue <n°>',
      };
  } catch (err) {
    result = { ok: false, error: String(err.message || err).split('\n')[0] };
  }
  console.log(JSON.stringify(result));
  process.exit(result.ok ? 0 : 1);
}

if (process.argv[1] && path.resolve(process.argv[1]) === fileURLToPath(import.meta.url)) main();
