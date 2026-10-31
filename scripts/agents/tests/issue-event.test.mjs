import assert from 'node:assert/strict';
import { test } from 'node:test';

import { buildIssueNotification } from '../issue-event.mjs';

const CREATED = '2026-10-07T10:00:00Z';
const LATER = new Date('2026-10-07T12:00:00Z');

const issue = (over = {}) => ({
  number: 71,
  title: 'SIMS-071 : [Feature] Détection des conflits',
  html_url: 'https://github.com/example-org/example-repo/issues/71',
  created_at: CREATED,
  labels: [{ name: 'feature' }, { name: 'backend' }, { name: 'high-priority' }],
  assignees: [],
  ...over,
});
const field = (n, name) => n.payload.fields.find((f) => f.name === name).value;

test('création', () => {
  const n = buildIssueNotification(
    { action: 'opened', issue: issue(), sender: { login: 'alice' } },
    LATER,
  );
  assert.equal(n.type, 'issue-opened');
  assert.equal(n.payload.title, 'SIMS-071 : [Feature] Détection des conflits');
  assert.equal(n.payload.description, 'Créé par alice');
  assert.equal(n.payload.url, 'https://github.com/example-org/example-repo/issues/71');
  assert.equal(field(n, 'Type'), 'Feature');
  assert.equal(field(n, 'Priorité'), '🔴 Haute');
  assert.equal(field(n, 'Assigné à'), 'personne');
  assert.equal(field(n, 'Badges'), '`feature` `backend` `high-priority`');
  assert.ok(!n.payload.fields.some((f) => f.name === 'Statut'));
});

test('assignation et désassignation', () => {
  const a = buildIssueNotification(
    {
      action: 'assigned',
      assignee: { login: 'bob' },
      issue: issue({ assignees: [{ login: 'bob' }] }),
      sender: { login: 'alice' },
    },
    LATER,
  );
  assert.equal(a.type, 'issue-assigned');
  assert.equal(a.payload.description, 'Assigné à **bob** par alice');
  assert.equal(field(a, 'Assigné à'), 'bob');
  const u = buildIssueNotification(
    { action: 'unassigned', assignee: { login: 'bob' }, issue: issue() },
    LATER,
  );
  assert.equal(u.payload.description, "**bob** n'est plus assigné");
});

test('changement de statut : seulement les labels de statut, hors création', () => {
  const ready = buildIssueNotification(
    {
      action: 'labeled',
      label: { name: 'agent:approved' },
      issue: issue({ labels: [{ name: 'agent:approved' }] }),
    },
    LATER,
  );
  assert.equal(ready.type, 'issue-status');
  assert.equal(ready.payload.description, 'Nouveau statut : **✅ Validé**');
  assert.equal(field(ready, 'Badges'), '`agent:approved`');

  // Label de type ou de priorité : pas un statut.
  assert.equal(
    buildIssueNotification({ action: 'labeled', label: { name: 'bug' }, issue: issue() }, LATER),
    null,
  );
  // Label de statut posé à la création : déjà dans le message « nouveau ticket ».
  const justCreated = new Date(new Date(CREATED).getTime() + 5000);
  assert.equal(
    buildIssueNotification(
      { action: 'labeled', label: { name: 'agent:pending' }, issue: issue() },
      justCreated,
    ),
    null,
  );
  // Label retiré : rien.
  assert.equal(
    buildIssueNotification(
      { action: 'unlabeled', label: { name: 'agent:approved' }, issue: issue() },
      LATER,
    ),
    null,
  );
});

test('fermeture et réouverture', () => {
  const done = buildIssueNotification(
    { action: 'closed', issue: issue({ state_reason: 'completed' }) },
    LATER,
  );
  assert.equal(done.type, 'issue-closed');
  assert.equal(done.payload.description, '✔️ Terminé');
  const dropped = buildIssueNotification(
    { action: 'closed', issue: issue({ state_reason: 'not_planned' }) },
    LATER,
  );
  assert.equal(dropped.payload.description, '🚫 Abandonné');
  assert.equal(
    buildIssueNotification({ action: 'reopened', issue: issue() }, LATER).type,
    'issue-reopened',
  );
});

test('événements ignorés', () => {
  assert.equal(buildIssueNotification({ action: 'edited', issue: issue() }, LATER), null);
  assert.equal(
    buildIssueNotification({ action: 'opened', issue: issue({ pull_request: {} }) }, LATER),
    null,
  );
  assert.equal(buildIssueNotification({}, LATER), null);
});
