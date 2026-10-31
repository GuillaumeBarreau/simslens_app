import assert from 'node:assert/strict';
import { test } from 'node:test';

import { branchName, checkPullRequest, issueFromBranch, simsId } from '../naming.mjs';

const OK = {
  branch: 'feat/SIMS-071',
  title: "SIMS-071 : [Feature] Détection visuelle et alerte de conflits d'assignation multiple",
  body: 'Closes #71\n\n## Résumé',
  labels: ['feature', 'backend', 'frontend', 'high-priority'],
};

test('identifiants', () => {
  assert.equal(simsId(7), 'SIMS-007');
  assert.equal(simsId(71), 'SIMS-071');
  assert.equal(simsId(1234), 'SIMS-1234');
  assert.equal(branchName(105), 'feat/SIMS-105');
  assert.equal(issueFromBranch('feat/SIMS-071'), 71);
  assert.equal(issueFromBranch('feat/SIMS-1234'), 1234);
  for (const b of [
    'feat/SIMS-71',
    'agent/SIMS-071',
    'feat/SIMS-071-slug',
    'fix/SIMS-071',
    'feat/sims-071',
    'master',
  ]) {
    assert.equal(issueFromBranch(b), null, b);
  }
});

test('PR conforme', () => {
  assert.deepEqual(checkPullRequest(OK), []);
  assert.deepEqual(checkPullRequest({ ...OK, body: 'Fixes #71' }), []);
});

test('PR non conformes', () => {
  const cases = [
    [{ branch: 'feat/dev-login' }, /branche/],
    [{ branch: 'feat/SIMS-71' }, /branche/],
    [{ branch: 'feat/SIMS-0071' }, /mal formé/],
    [{ branch: 'feat/SIMS-072' }, /même issue/],
    [{ title: 'SIMS-71: [Feature] x' }, /titre/],
    [{ title: 'SIMS-071 : [Feat] x' }, /titre/],
    [{ body: 'Closes #7' }, /Closes #71/],
    [{ labels: ['backend', 'high-priority'] }, /type manquant : feature/],
    [{ labels: ['feature', 'high-priority'] }, /périmètre/],
    [{ labels: ['feature', 'backend'] }, /priorité/],
    [{ labels: ['feature', 'backend', 'high-priority', 'low-priority'] }, /priorité/],
  ];
  for (const [override, expected] of cases) {
    const problems = checkPullRequest({ ...OK, ...override });
    assert.ok(
      problems.some((p) => expected.test(p)),
      `${JSON.stringify(override)} → ${JSON.stringify(problems)}`,
    );
  }
});
