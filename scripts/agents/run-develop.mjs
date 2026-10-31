#!/usr/bin/env node
/**
 * Étape 3, lancée par le mainteneur : traite les
 * décisions qu'il a posées sur les issues des agents.
 *
 *   ❌ agent:rejected  → issue fermée « not planned » ;
 *   ✅ agent:approved  → objectif : milestone créé (gh.mjs milestone-from-issue) ;
 *                        autre issue : développée dans un worktree, puis PR ouverte.
 *
 * Usage : node scripts/agents/run-develop.mjs [--dry-run] [--only <n°>]
 *         (npm run agents:develop)
 *
 * Une issue à la fois. Pour chacune : worktree `../<dépôt>-SIMS-NNN` (junctions
 * node_modules), session Claude `/develop-issue` dans ce worktree (AGENTS_MODE=1 :
 * garde strict, aucune écriture GitHub), puis ce script — pas l'agent — relance la
 * vérification, pousse la branche et ouvre la PR (brouillon si la vérification n'est
 * pas verte). Bloquée → label agent:blocked et rapport en commentaire.
 *
 * Fichiers : .agents-out/develop/<id>/ (progress.log, SIMS-NNN/…).
 */
import { execFileSync, spawnSync } from 'node:child_process';
import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

import { claudeWorks, findClaude, runClaude } from './claude-runner.mjs';
import { ensureOutDir, killSwitchActive, loadConfig, ROOT } from './lib.mjs';
import { branchName, PRIORITY_LABELS, SCOPE_LABELS, simsId, TYPE_LABELS } from './naming.mjs';
import { createWorktree, removeWorktree } from './worktree.mjs';

export const LABEL = {
  pending: 'agent:pending',
  approved: 'agent:approved',
  rejected: 'agent:rejected',
  inProgress: 'agent:in-progress',
  inReview: 'agent:in-review',
  blocked: 'agent:blocked',
  takeover: 'human:takeover',
};

const PRIORITY_RANK = { 'high-priority': 0, 'medium-priority': 1, 'low-priority': 2 };

/**
 * Répartit les issues ouvertes selon les décisions du mainteneur.
 * @param {{number:number,title:string,labels:string[]}[]} issues
 * @param {{ slots: number }} options places de PR disponibles
 */
export function planRun(issues, { slots }) {
  const plan = { reject: [], objectives: [], develop: [], skipped: [] };
  const candidates = [];
  for (const issue of issues) {
    const has = (l) => issue.labels.includes(l);
    if (has(LABEL.rejected)) {
      plan.reject.push(issue);
      continue;
    }
    if (!has(LABEL.approved)) continue;
    if (has('objective')) {
      plan.objectives.push(issue);
      continue;
    }
    const busy = [LABEL.takeover, LABEL.inProgress, LABEL.inReview, LABEL.blocked].find(has);
    if (busy) plan.skipped.push({ issue, reason: `déjà ${busy}` });
    else candidates.push(issue);
  }
  const rank = (i) => Math.min(3, ...i.labels.map((l) => PRIORITY_RANK[l] ?? 3));
  candidates.sort((a, b) => rank(a) - rank(b) || a.number - b.number);
  const free = Math.max(0, slots);
  plan.develop = candidates.slice(0, free);
  for (const issue of candidates.slice(free)) {
    plan.skipped.push({ issue, reason: 'plus de place pour une PR (maxOpenAgentPRs)' });
  }
  return plan;
}

/** Labels de la PR : ceux de l'issue qui décrivent le type, le périmètre et la priorité. */
export function prLabels(issueLabels) {
  const keep = new Set([...Object.values(TYPE_LABELS), ...SCOPE_LABELS, ...PRIORITY_LABELS]);
  return issueLabels.filter((l) => keep.has(l));
}

/** Corps de PR : `Closes #N` en tête (exigé par la CI), puis le corps rédigé par l'agent. */
export function prBody(issueNumber, agentBody, verifySummary) {
  const body = String(agentBody || '')
    .replace(/^\s*Closes #\d+\s*/i, '')
    .trim();
  return [
    `Closes #${issueNumber}`,
    '',
    body || '_Corps de PR non fourni par l’agent._',
    '',
    '## Vérification par `agents:develop`',
    '',
    verifySummary.trim(),
    '',
  ].join('\n');
}

// --------------------------------------------------------------------- exécution

const gh = (args, opts = {}) =>
  execFileSync('gh', args, {
    cwd: opts.cwd || ROOT,
    encoding: 'utf8',
    stdio: ['ignore', 'pipe', 'pipe'],
  });
const ghJson = (args) => JSON.parse(gh(args));
const git = (args, cwd) =>
  execFileSync('git', args, { cwd, encoding: 'utf8', stdio: ['ignore', 'pipe', 'pipe'] });

function notifier(runId) {
  return (type, payload) =>
    spawnSync(process.execPath, [path.join(ROOT, 'scripts/agents/notify.mjs'), type, '-'], {
      input: JSON.stringify(payload),
      encoding: 'utf8',
      env: { ...process.env, AGENTS_CYCLE_ID: runId },
    });
}

function editLabels(n, { add = [], remove = [] }) {
  const args = ['issue', 'edit', String(n)];
  if (add.length) args.push('--add-label', add.join(','));
  if (remove.length) args.push('--remove-label', remove.join(','));
  gh(args);
}

function openAgentPRs() {
  return ghJson(['pr', 'list', '--state', 'open', '--limit', '100', '--json', 'headRefName'])
    .map((p) => p.headRefName)
    .filter((b) => /^feat\/SIMS-\d{3,}$/.test(b)).length;
}

function readJson(file) {
  try {
    return JSON.parse(fs.readFileSync(file, 'utf8'));
  } catch {
    return null;
  }
}

/** Ligne JSON rendue par gh.mjs. */
function parseResult(r) {
  try {
    return JSON.parse(r.stdout);
  } catch {
    return { ok: false, error: (r.stderr || 'réponse illisible').trim() };
  }
}

/** Développe une issue ; renvoie { status: 'pr'|'blocked', url?, reason? }. */
async function developIssue(issue, { runId, runDir, config, claudeBin, log }) {
  const n = issue.number;
  const id = simsId(n);
  const outDir = path.join(runDir, id);
  editLabels(n, { add: [LABEL.inProgress], remove: [LABEL.approved, LABEL.pending] });

  let wt;
  try {
    git(['fetch', 'origin', 'master'], ROOT);
    wt = createWorktree(n).path;
  } catch (err) {
    return { status: 'blocked', reason: `worktree impossible : ${err.message}` };
  }
  log(`🛠 ${id} — worktree ${wt}`);

  let result = { status: 'blocked', reason: 'raison inconnue' };
  try {
    const run = await runClaude({
      bin: claudeBin,
      prompt: `/develop-issue ${n}`,
      cwd: wt,
      env: { AGENTS_MODE: '1', AGENTS_CYCLE_ID: runId },
      outDir,
      maxMinutes: config.budgets.issueMaxMinutes,
    });
    const status = readJson(path.join(wt, '.agents-out', 'develop', 'status.json'));
    const ahead = Number(git(['rev-list', '--count', 'origin/master..HEAD'], wt).trim());
    const branch = git(['branch', '--show-current'], wt).trim();

    if (run.timedOut) {
      result = {
        status: 'blocked',
        reason: `durée max de ${config.budgets.issueMaxMinutes} min dépassée`,
      };
    } else if (status?.status !== 'ready') {
      result = {
        status: 'blocked',
        reason: status?.summary || `session terminée sans rapport (code ${run.code})`,
      };
    } else if (branch !== branchName(n) || ahead === 0) {
      result = {
        status: 'blocked',
        reason: `aucun commit sur ${branchName(n)} (branche : ${branch})`,
      };
    } else {
      // Vérification indépendante de celle de l'agent.
      const verify = spawnSync(process.execPath, ['scripts/agents/verify.mjs'], {
        cwd: wt,
        encoding: 'utf8',
      });
      const verifyMd = fs.existsSync(path.join(wt, '.agents-out', 'verify.md'))
        ? fs.readFileSync(path.join(wt, '.agents-out', 'verify.md'), 'utf8')
        : verify.stdout;
      const green = verify.status === 0;
      git(['push', '-u', 'origin', branchName(n)], wt);

      const bodyFile = path.join(outDir, 'pr.md');
      fs.writeFileSync(
        bodyFile,
        prBody(
          n,
          fs.existsSync(path.join(wt, '.agents-out', 'develop', 'pr.md'))
            ? fs.readFileSync(path.join(wt, '.agents-out', 'develop', 'pr.md'), 'utf8')
            : '',
          verifyMd,
        ),
      );
      const args = ['pr', 'create', '--base', 'master', '--head', branchName(n)];
      args.push('--title', issue.title, '--body-file', bodyFile);
      for (const l of prLabels(issue.labels)) args.push('--label', l);
      if (config.maintainer) args.push('--assignee', config.maintainer);
      if (!green) args.push('--draft');
      const url = gh(args).trim();
      result = { status: 'pr', url, green, verifyCode: verify.status };
    }
  } catch (err) {
    result = { status: 'blocked', reason: String(err.message || err).split('\n')[0] };
  } finally {
    try {
      // Bloquée : la branche locale reste pour que le mainteneur puisse la reprendre.
      removeWorktree(n, { keepBranch: result.status !== 'pr' });
    } catch (err) {
      log(`⚠️ ${id} — nettoyage du worktree : ${err.message}`);
    }
  }

  if (result.status === 'pr') {
    editLabels(n, { add: [LABEL.inReview], remove: [LABEL.inProgress] });
  } else {
    editLabels(n, { add: [LABEL.blocked], remove: [LABEL.inProgress] });
    const note = path.join(outDir, 'blocked.md');
    fs.mkdirSync(outDir, { recursive: true });
    fs.writeFileSync(
      note,
      `🤖 **Développement bloqué** (étape 3, ${runId})\n\n${result.reason}\n\n` +
        `Branche locale \`${branchName(n)}\` conservée chez le mainteneur s'il y a des commits. ` +
        `Pour relancer : retirer \`${LABEL.blocked}\` et remettre \`${LABEL.approved}\`.`,
    );
    gh(['issue', 'comment', String(n), '--body-file', note]);
  }
  return result;
}

async function main() {
  const dryRun = process.argv.includes('--dry-run');
  const onlyIdx = process.argv.indexOf('--only');
  const only = onlyIdx > 0 ? Number(process.argv[onlyIdx + 1]) : null;
  const config = loadConfig();
  const runId = `dev-${new Date().toISOString().slice(0, 16).replace(':', 'h')}`;

  const killed = killSwitchActive();
  if (killed) {
    console.log(`🛑 Kill switch actif (${killed}) : rien n'est lancé.`);
    process.exit(0);
  }

  // Verrou partagé avec le cycle : jamais les deux en même temps.
  const lockFile = path.join(ensureOutDir(), 'cycle.lock');
  if (fs.existsSync(lockFile)) {
    console.error(
      `❌ Un cycle ou une étape 3 est déjà en cours (${fs.readFileSync(lockFile, 'utf8')}).`,
    );
    process.exit(1);
  }

  const issues = ghJson([
    'issue',
    'list',
    '--state',
    'open',
    '--label',
    'agent:authored',
    '--limit',
    '200',
    '--json',
    'number,title,labels',
  ])
    .map((i) => ({ ...i, labels: i.labels.map((l) => l.name) }))
    .filter((i) => !only || i.number === only);
  const slots = config.budgets.maxOpenAgentPRs - openAgentPRs();
  const plan = planRun(issues, { slots });

  const line = (i) => `#${i.number} ${i.title}`;
  console.log(`Étape 3 ${runId}`);
  console.log(
    `❌ À fermer (${plan.reject.length}) :${plan.reject.map((i) => `\n   ${line(i)}`).join('')}`,
  );
  console.log(
    `🎯 Objectifs → milestones (${plan.objectives.length}) :${plan.objectives.map((i) => `\n   ${line(i)}`).join('')}`,
  );
  console.log(
    `🛠 À développer (${plan.develop.length}) :${plan.develop.map((i) => `\n   ${line(i)}`).join('')}`,
  );
  for (const s of plan.skipped) console.log(`⏭  ${line(s.issue)} — ${s.reason}`);
  if (dryRun) process.exit(0);

  const claudeBin = findClaude();
  if (plan.develop.length && !claudeWorks(claudeBin)) {
    console.error('❌ Claude Code introuvable (voir claude-runner.mjs).');
    process.exit(1);
  }

  const runDir = path.join(ensureOutDir(), 'develop', runId);
  fs.mkdirSync(runDir, { recursive: true });
  fs.writeFileSync(lockFile, runId);
  const progress = path.join(runDir, 'progress.log');
  const log = (msg) => {
    const l = `${new Date().toTimeString().slice(0, 8)} ${msg}`;
    console.log(l);
    fs.appendFileSync(progress, `${l}\n`);
  };
  const notify = notifier(runId);
  const report = { closed: [], milestones: [], prs: [], blocked: [] };

  try {
    notify('develop-start', {
      title: `Étape 3 ${runId}`,
      description: `${plan.reject.length} à fermer · ${plan.objectives.length} objectif(s) · ${plan.develop.length} à développer`,
    });

    for (const issue of plan.reject) {
      gh([
        'issue',
        'comment',
        String(issue.number),
        '--body',
        '🤖 Refusée par le mainteneur (`agent:rejected`) : fermée à l’étape 3.',
      ]);
      gh(['issue', 'close', String(issue.number), '--reason', 'not planned']);
      editLabels(issue.number, { remove: [LABEL.pending] });
      report.closed.push(issue);
      log(`❌ #${issue.number} fermée`);
    }

    for (const issue of plan.objectives) {
      const r = spawnSync(
        process.execPath,
        ['scripts/agents/gh.mjs', 'milestone-from-issue', String(issue.number)],
        {
          cwd: ROOT,
          encoding: 'utf8',
        },
      );
      const out = parseResult(r);
      if (out.ok) report.milestones.push({ issue, url: out.url });
      log(`🎯 #${issue.number} ${out.ok ? `milestone ${out.url}` : `échec : ${out.error}`}`);
    }

    for (const issue of plan.develop) {
      if (killSwitchActive()) {
        log('🛑 Kill switch activé : arrêt avant l’issue suivante.');
        break;
      }
      log(`▶️ #${issue.number} ${issue.title}`);
      const r = await developIssue(issue, { runId, runDir, config, claudeBin, log });
      if (r.status === 'pr') {
        report.prs.push({ issue, ...r });
        log(
          `✅ #${issue.number} → ${r.url}${r.green ? '' : ' (brouillon : vérification non verte)'}`,
        );
        notify('review-ready', {
          title: issue.title,
          url: r.url,
          description: r.green
            ? 'Vérification verte : prête à relire.'
            : 'PR brouillon : la vérification demande une intervention.',
        });
      } else {
        report.blocked.push({ issue, ...r });
        log(`⛔ #${issue.number} bloquée : ${r.reason}`);
      }
    }
  } finally {
    fs.rmSync(lockFile, { force: true });
  }

  const fields = [
    ...report.prs.map((p) => ({
      name: `✅ #${p.issue.number}`,
      value: `${p.url}${p.green ? '' : ' (brouillon)'}`,
    })),
    ...report.blocked.map((b) => ({
      name: `⛔ #${b.issue.number}`,
      value: b.reason.slice(0, 200),
    })),
  ];
  notify('develop-report', {
    title: `Étape 3 ${runId} terminée`,
    description: `${report.closed.length} fermée(s) · ${report.milestones.length} milestone(s) · ${report.prs.length} PR · ${report.blocked.length} bloquée(s)`,
    fields,
  });
  log(
    `🏁 Fin — ${report.prs.length} PR, ${report.blocked.length} bloquée(s), ${report.closed.length} fermée(s)`,
  );
}

if (process.argv[1] && path.resolve(process.argv[1]) === fileURLToPath(import.meta.url)) {
  main().catch((err) => {
    console.error(`❌ ${err.message}`);
    process.exit(1);
  });
}
