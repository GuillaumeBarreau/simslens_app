#!/usr/bin/env node
/**
 * Envoie une notification du système d'agents sur Discord, via un webhook entrant
 * vers le serveur personnel du mainteneur.
 *
 * Usage :
 *   node scripts/agents/notify.mjs <type> <payload.json | ->  [--dry-run]
 *
 * Payload : { "title": "...", "description": "...", "url": "...",
 *             "fields": [{ "name": "...", "value": "..." }] }
 *
 * - URL du webhook : AGENTS_DISCORD_WEBHOOK_URL dans `.env.agents` (non versionné).
 * - Le contenu est filtré (secrets, e-mails, identifiants Discord) et tronqué.
 * - Au-delà du quota par cycle, les messages non critiques sont mis de côté et
 *   regroupés dans le prochain `cycle-report`.
 * - Sans webhook configuré : avertit et sort en 0, pour ne pas casser un cycle.
 */
import fs from 'node:fs';
import path from 'node:path';

import { ensureOutDir, loadConfig, readAgentsEnv } from './lib.mjs';

const TYPES = {
  'cycle-start': { color: 0x95a5a6, emoji: '▶️', label: 'Début de cycle' },
  'cycle-report': { color: 0x3498db, emoji: '📊', label: 'Rapport de cycle' },
  proposals: { color: 0x9b59b6, emoji: '💡', label: 'Nouvelles propositions' },
  'develop-start': { color: 0x95a5a6, emoji: '🛠', label: 'Étape 3 : développement' },
  'develop-report': { color: 0x3498db, emoji: '🏁', label: 'Étape 3 : bilan' },
  'review-ready': { color: 0x2ecc71, emoji: '👀', label: 'PR prête à relire' },
  'approval-needed': { color: 0xe67e22, emoji: '✋', label: 'Validation humaine requise' },
  failure: { color: 0xe74c3c, emoji: '⛔', label: 'Échec' },
  'release-ready': { color: 0xf1c40f, emoji: '🚀', label: 'Prêt pour la prod' },
  killswitch: { color: 0x000000, emoji: '🛑', label: 'Kill switch' },
  'issue-opened': { color: 0x5865f2, emoji: '🆕', label: 'Nouveau ticket' },
  'issue-assigned': { color: 0x1abc9c, emoji: '👤', label: 'Assignation' },
  'issue-status': { color: 0xe67e22, emoji: '🔄', label: 'Changement de statut' },
  'issue-closed': { color: 0x2ecc71, emoji: '✔️', label: 'Ticket fermé' },
  'issue-reopened': { color: 0xf1c40f, emoji: '↩️', label: 'Ticket rouvert' },
};
// Jamais retardés par le quota.
const CRITICAL = new Set([
  'cycle-report',
  'develop-report',
  'failure',
  'approval-needed',
  'killswitch',
]);

const LIMITS = { title: 200, description: 1500, fieldName: 100, fieldValue: 900, fields: 10 };

const REDACTIONS = [
  [/https:\/\/(?:\w+\.)?discord(?:app)?\.com\/api\/webhooks\/\S+/gi, '[webhook masqué]'],
  [/\b(?:gh[pousr]_[A-Za-z0-9]{20,}|github_pat_[A-Za-z0-9_]{20,})\b/g, '[token masqué]'],
  [/\b(?:sk|pk|rk)_(?:live|test)_[A-Za-z0-9]{10,}\b/g, '[clé masquée]'],
  [/\bsk-ant-[A-Za-z0-9-_]{10,}\b/g, '[clé masquée]'],
  [/\bBearer\s+[A-Za-z0-9._~+/=-]{10,}/gi, 'Bearer [masqué]'],
  [/\b[\w.+-]+@[\w-]+\.[\w.-]+\b/g, '[e-mail masqué]'],
  [/\b(?:postgres(?:ql)?|redis|mysql|mongodb):\/\/\S+/gi, '[URL de base masquée]'],
  [/\b\d{17,20}\b/g, '[id masqué]'],
  [
    /^\s*[A-Z][A-Z0-9_]*(?:SECRET|TOKEN|KEY|PASSWORD)[A-Z0-9_]*\s*=.*$/gim,
    '[variable sensible masquée]',
  ],
];

function sanitize(text, max) {
  let s = String(text ?? '');
  for (const [re, by] of REDACTIONS) s = s.replace(re, by);
  return s.length > max ? `${s.slice(0, max - 1)}…` : s;
}

function readPayload(arg) {
  if (!arg) return {};
  const raw = arg === '-' ? fs.readFileSync(0, 'utf8') : fs.readFileSync(path.resolve(arg), 'utf8');
  return JSON.parse(raw);
}

function buildMessage(type, payload) {
  const meta = TYPES[type];
  const embed = {
    title: sanitize(`${meta.emoji} ${payload.title || meta.label}`, LIMITS.title),
    description: sanitize(payload.description || '', LIMITS.description),
    color: meta.color,
    timestamp: new Date().toISOString(),
    footer: { text: `Droptimizer · agents · ${meta.label}` },
    fields: (payload.fields || []).slice(0, LIMITS.fields).map((f) => ({
      name: sanitize(f.name, LIMITS.fieldName) || '—',
      value: sanitize(f.value, LIMITS.fieldValue) || '—',
      inline: Boolean(f.inline),
    })),
  };
  if (payload.url && /^https:\/\/github\.com\//.test(payload.url)) embed.url = payload.url;
  return { username: 'Droptimizer · agents', allowed_mentions: { parse: [] }, embeds: [embed] };
}

/** Compte les messages du cycle courant ; renvoie false si le quota est atteint. */
function takeQuota(type) {
  const cycle = process.env.AGENTS_CYCLE_ID;
  if (!cycle || CRITICAL.has(type)) return true;
  const file = path.join(ensureOutDir(), `discord-${cycle.replace(/[^\w-]/g, '_')}.count`);
  const sent = fs.existsSync(file) ? Number(fs.readFileSync(file, 'utf8')) || 0 : 0;
  if (sent >= loadConfig().quotas.discordMessagesPerCycle) return false;
  fs.writeFileSync(file, String(sent + 1));
  return true;
}

const DIGEST = () => path.join(ensureOutDir(), 'discord-digest.json');

function deferToDigest(type, payload) {
  const file = DIGEST();
  const list = fs.existsSync(file) ? JSON.parse(fs.readFileSync(file, 'utf8')) : [];
  list.push({ type, title: payload.title || TYPES[type].label, url: payload.url });
  fs.writeFileSync(file, JSON.stringify(list, null, 2));
}

/** Le rapport de cycle reprend les messages mis de côté. */
function attachDigest(payload) {
  const file = DIGEST();
  if (!fs.existsSync(file)) return payload;
  const list = JSON.parse(fs.readFileSync(file, 'utf8'));
  fs.rmSync(file);
  if (!list.length) return payload;
  const value = list
    .map((x) => `• ${TYPES[x.type]?.emoji ?? ''} ${x.url ? `[${x.title}](${x.url})` : x.title}`)
    .join('\n');
  return {
    ...payload,
    fields: [...(payload.fields || []), { name: 'Également pendant ce cycle', value }],
  };
}

async function main() {
  const [type, payloadArg] = process.argv.slice(2).filter((a) => !a.startsWith('--'));
  const dryRun = process.argv.includes('--dry-run');
  if (!TYPES[type]) {
    console.error(`Type inconnu « ${type} ». Types : ${Object.keys(TYPES).join(', ')}`);
    process.exit(1);
  }

  let payload = readPayload(payloadArg);
  if (type === 'cycle-report') payload = attachDigest(payload);

  if (!dryRun && !takeQuota(type)) {
    deferToDigest(type, payload);
    console.log(
      `⏸ Quota Discord du cycle atteint : « ${type} » regroupé dans le rapport de cycle.`,
    );
    return;
  }

  const message = buildMessage(type, payload);
  if (dryRun) {
    console.log(JSON.stringify(message, null, 2));
    return;
  }

  // CI : secret GitHub en variable d'environnement ; en local : .env.agents.
  const url = process.env.AGENTS_DISCORD_WEBHOOK_URL || readAgentsEnv().AGENTS_DISCORD_WEBHOOK_URL;
  if (!url) {
    console.warn(
      '⚠️ AGENTS_DISCORD_WEBHOOK_URL absent (variable d’environnement ou .env.agents) : notification ignorée.',
    );
    return;
  }

  const res = await fetch(`${url}?wait=true`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(message),
  });
  if (!res.ok) {
    console.error(`❌ Discord a répondu ${res.status} : ${sanitize(await res.text(), 300)}`);
    process.exit(1);
  }
  console.log(`✅ Notification « ${type} » envoyée.`);
}

main();
