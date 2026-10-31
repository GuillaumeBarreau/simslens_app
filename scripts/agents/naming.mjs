/**
 * Conventions de nommage qui relient branches, PR et issues.
 *
 *   Issue  #71
 *   Branche feat/SIMS-071
 *   PR     « SIMS-071 : [Feature] Titre », corps « Closes #71 »
 *
 * Le numéro est celui de l'issue GitHub, sur au moins 3 chiffres. Source unique : le
 * garde, le contrôle de PR (CI) et les scripts d'automatisation importent ce module.
 */

export const TYPES = [
  'Feature',
  'Enhancement',
  'Bug',
  'Tech-Debt',
  'Refactoring',
  'Documentation',
  'Security',
  'Tests',
];
export const TYPE_LABELS = {
  Feature: 'feature',
  Enhancement: 'enhancement',
  Bug: 'bug',
  'Tech-Debt': 'tech-debt',
  Refactoring: 'refactoring',
  Documentation: 'documentation',
  Security: 'security',
  Tests: 'tests',
};
export const SCOPE_LABELS = ['backend', 'frontend', 'api', 'data', 'ux', 'ARCHI'];
export const PRIORITY_LABELS = ['high-priority', 'medium-priority', 'low-priority'];

export const BRANCH_RE = /^feat\/SIMS-(\d{3,})$/;
export const TITLE_RE = new RegExp(`^SIMS-(\\d{3,}) : \\[(${TYPES.join('|')})\\] \\S.*$`);

/** 71 → « SIMS-071 » */
export const simsId = (issueNumber) => `SIMS-${String(issueNumber).padStart(3, '0')}`;
/** 71 → « feat/SIMS-071 » */
export const branchName = (issueNumber) => `feat/${simsId(issueNumber)}`;

/** « feat/SIMS-071 » → 71, sinon null. */
export function issueFromBranch(branch) {
  const m = BRANCH_RE.exec(branch || '');
  return m ? Number(m[1]) : null;
}

/** Le numéro doit être écrit sur 3 chiffres au moins, sans zéro superflu au-delà. */
const canonical = (digits) => digits === String(Number(digits)).padStart(3, '0');

/**
 * Contrôle une PR. Renvoie la liste des problèmes (vide = conforme).
 * @param {{ branch: string, title: string, body?: string, labels?: string[] }} pr
 */
export function checkPullRequest({ branch, title, body = '', labels = [] }) {
  const problems = [];

  const b = BRANCH_RE.exec(branch || '');
  if (!b)
    problems.push(
      `branche « ${branch} » : attendu feat/SIMS-<n° de l'issue sur 3 chiffres>, ex. feat/SIMS-071`,
    );
  else if (!canonical(b[1]))
    problems.push(`branche « ${branch} » : numéro mal formé, attendu ${branchName(Number(b[1]))}`);

  const t = TITLE_RE.exec(title || '');
  if (!t)
    problems.push(
      `titre « ${title} » : attendu « SIMS-<n°> : [<Type>] <Titre> », types : ${TYPES.join(', ')}`,
    );
  else if (!canonical(t[1]))
    problems.push(`titre : numéro mal formé, attendu ${simsId(Number(t[1]))}`);

  if (b && t && Number(b[1]) !== Number(t[1])) {
    problems.push(
      `branche (${simsId(Number(b[1]))}) et titre (${simsId(Number(t[1]))}) ne désignent pas la même issue`,
    );
  }

  const issue = b ? Number(b[1]) : t ? Number(t[1]) : null;
  if (
    issue !== null &&
    !new RegExp(`\\b(close[sd]?|fix(e[sd])?|resolve[sd]?) #${issue}\\b`, 'i').test(body)
  ) {
    problems.push(`corps : « Closes #${issue} » manquant`);
  }

  if (t && !labels.includes(TYPE_LABELS[t[2]]))
    problems.push(`label de type manquant : ${TYPE_LABELS[t[2]]}`);
  if (!labels.some((l) => SCOPE_LABELS.includes(l)))
    problems.push(`au moins un label de périmètre requis : ${SCOPE_LABELS.join(', ')}`);
  const priorities = labels.filter((l) => PRIORITY_LABELS.includes(l));
  if (priorities.length !== 1)
    problems.push(
      `exactement un label de priorité requis (${PRIORITY_LABELS.join(', ')}) — trouvé : ${priorities.join(', ') || 'aucun'}`,
    );

  return problems;
}

/**
 * Labels de statut d'une issue, du plus prioritaire au moins prioritaire (quand
 * plusieurs coexistent, le premier l'emporte). Utilisés par tickets.mjs et par les
 * notifications Discord des changements de statut.
 */
export const STATUS_LABELS = [
  { label: 'human:takeover', text: '🙋 Repris par un humain' },
  { label: 'agent:rejected', text: '❌ Refusé' },
  { label: 'agent:blocked', text: '⛔ Bloqué' },
  { label: 'needs-human-approval', text: '✋ Validation humaine' },
  { label: 'agent:in-review', text: '🔍 En relecture' },
  { label: 'agent:in-progress', text: '🛠 En cours' },
  { label: 'agent:approved', text: '✅ Validé' },
  { label: 'needs-clarification', text: '❓ À préciser' },
  { label: 'agent:pending', text: '⏳ En attente' },
];
