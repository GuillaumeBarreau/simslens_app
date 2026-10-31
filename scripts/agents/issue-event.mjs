#!/usr/bin/env node
/**
 * Publie sur Discord les événements d'une issue GitHub : création, assignation,
 * changement de statut, fermeture, réouverture. Exécuté par
 * .github/workflows/issue-notify.yml (événement `issues`).
 *
 * Usage : GITHUB_EVENT_PATH=event.json node scripts/agents/issue-event.mjs [--dry-run]
 *
 * Filtrage, pour éviter le bruit :
 *   - seuls les labels de statut comptent (naming.mjs → STATUS_LABELS) ;
 *   - les labels posés juste après la création sont déjà dans le message « nouveau » ;
 *   - un label retiré ne publie rien : le nouveau statut arrive avec le label ajouté.
 */
import { spawnSync } from 'node:child_process';
import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

import { PRIORITY_LABELS, simsId, STATUS_LABELS, TYPE_LABELS } from './naming.mjs';

const HERE = path.dirname(fileURLToPath(import.meta.url));
// Les labels ajoutés dans cette fenêtre après la création font partie de la création.
const CREATION_GRACE_MS = 60_000;

const STATUS = new Map(STATUS_LABELS.map((s) => [s.label, s.text]));
const TYPE_BY_LABEL = Object.fromEntries(Object.entries(TYPE_LABELS).map(([t, l]) => [l, t]));
const PRIORITY_TEXT = {
  'high-priority': '🔴 Haute',
  'medium-priority': '🟠 Moyenne',
  'low-priority': '🟢 Basse',
};

const names = (list) => (list || []).map((x) => x.login || x.name).filter(Boolean);
const cleanTitle = (title) => title.replace(/^\s*SIMS-\d+\s*:?\s*/i, '').trim();

/** Labels en badges (Discord n'affiche pas leurs couleurs) : `feature` `backend` … */
export const badges = (labels) => labels.map((l) => '`' + l + '`').join(' ') || '—';

/** Champs communs : type, priorité, assignés, puis tous les labels en badges. */
function issueFields(issue) {
  const labels = names(issue.labels);
  const type = labels.map((l) => TYPE_BY_LABEL[l]).find(Boolean);
  const priority = labels.find((l) => PRIORITY_LABELS.includes(l));
  const assignees = names(issue.assignees);
  return [
    { name: 'Type', value: type || '—', inline: true },
    { name: 'Priorité', value: PRIORITY_TEXT[priority] || '—', inline: true },
    { name: 'Assigné à', value: assignees.join(', ') || 'personne', inline: true },
    { name: 'Badges', value: badges(labels), inline: false },
  ];
}

/**
 * @param {object} event  charge utile GitHub de l'événement `issues`
 * @param {Date} [now]
 * @returns {{ type: string, payload: object } | null}  null = rien à publier
 */
export function buildIssueNotification(event, now = new Date()) {
  const { action, issue, sender } = event || {};
  if (!issue || issue.pull_request) return null;

  const id = simsId(issue.number);
  const title = `${id} : ${cleanTitle(issue.title)}`;
  const by = sender?.login ? `par ${sender.login}` : '';
  const base = { title, url: issue.html_url, fields: issueFields(issue) };

  switch (action) {
    case 'opened':
      return { type: 'issue-opened', payload: { ...base, description: `Créé ${by}`.trim() } };

    case 'assigned':
    case 'unassigned': {
      const who = event.assignee?.login || '?';
      const description =
        action === 'assigned'
          ? `Assigné à **${who}** ${by}`
          : `**${who}** n'est plus assigné ${by}`;
      return { type: 'issue-assigned', payload: { ...base, description: description.trim() } };
    }

    case 'labeled': {
      const label = event.label?.name;
      if (!STATUS.has(label)) return null;
      const age = now.getTime() - new Date(issue.created_at).getTime();
      if (age >= 0 && age < CREATION_GRACE_MS) return null;
      return {
        type: 'issue-status',
        payload: { ...base, description: `Nouveau statut : **${STATUS.get(label)}** ${by}`.trim() },
      };
    }

    case 'closed': {
      const how =
        issue.state_reason === 'not_planned'
          ? '🚫 Abandonné'
          : issue.state_reason === 'duplicate'
            ? '🔁 Doublon'
            : '✔️ Terminé';
      return { type: 'issue-closed', payload: { ...base, description: `${how} ${by}`.trim() } };
    }

    case 'reopened':
      return { type: 'issue-reopened', payload: { ...base, description: `Rouvert ${by}`.trim() } };

    default:
      return null;
  }
}

function main() {
  const eventPath = process.env.GITHUB_EVENT_PATH;
  if (!eventPath || !fs.existsSync(eventPath)) {
    console.error('GITHUB_EVENT_PATH manquant : ce script lit l’événement GitHub.');
    process.exit(1);
  }
  const event = JSON.parse(fs.readFileSync(eventPath, 'utf8'));
  const notification = buildIssueNotification(event);
  if (!notification) {
    console.log(`⏭ Événement « ${event.action} » ignoré (rien à publier).`);
    return;
  }
  const args = [path.join(HERE, 'notify.mjs'), notification.type, '-'];
  if (process.argv.includes('--dry-run')) args.push('--dry-run');
  const r = spawnSync(process.execPath, args, {
    input: JSON.stringify(notification.payload),
    stdio: ['pipe', 'inherit', 'inherit'],
  });
  process.exit(r.status ?? 1);
}

if (process.argv[1] && path.resolve(process.argv[1]) === fileURLToPath(import.meta.url)) main();
