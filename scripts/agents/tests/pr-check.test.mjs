import assert from 'node:assert/strict';
import { test } from 'node:test';

import { evaluatePullRequest, prOrigin } from '../pr-check.mjs';

const BASE = 'example-org/example-repo';
const OK = {
  branch: 'feat/SIMS-071',
  title: 'SIMS-071 : [Feature] Détection des conflits',
  body: 'Closes #71',
  labels: ['feature', 'backend', 'high-priority'],
  author: 'alice',
  headRepo: BASE,
  baseRepo: BASE,
};
const NON_CONFORME = { branch: 'fix-typo', title: 'Fix typo', body: '', labels: [] };

test('origine de la PR', () => {
  assert.equal(prOrigin(OK), 'internal');
  assert.equal(prOrigin({ ...OK, headRepo: 'Example-Org/Example-Repo' }), 'internal');
  assert.equal(prOrigin({ ...OK, headRepo: 'bob/example-repo' }), 'fork');
  assert.equal(prOrigin({ ...OK, headRepo: null }), 'fork');
  assert.equal(prOrigin({ ...OK, isCrossRepository: true }), 'fork');
  assert.equal(prOrigin({ ...OK, author: 'dependabot[bot]' }), 'dependabot');
  assert.equal(prOrigin({ ...OK, author: 'app/dependabot' }), 'dependabot');
  // Dépôt de base ou de tête inconnu (usage local par variables) : interne.
  assert.equal(prOrigin({ author: 'alice' }), 'internal');
  assert.equal(prOrigin({ headRepo: 'bob/example-repo', author: 'alice' }), 'internal');
});

test('PR interne conforme : code 0', () => {
  const r = evaluatePullRequest(OK);
  assert.equal(r.code, 0);
  assert.deepEqual(r.problems, []);
  assert.match(r.lines[0], /conforme/);
});

test('PR interne non conforme : bloquante (code 1)', () => {
  const r = evaluatePullRequest({ ...OK, ...NON_CONFORME });
  assert.equal(r.code, 1);
  assert.equal(r.origin, 'internal');
  assert.ok(r.problems.length > 0);
  assert.match(r.lines[0], /non conforme/);
});

test('PR depuis un fork non conforme : avertissement (code 0)', () => {
  for (const fork of [{ headRepo: 'bob/example-repo' }, { isCrossRepository: true }]) {
    const r = evaluatePullRequest({ ...OK, ...NON_CONFORME, author: 'bob', ...fork });
    assert.equal(r.code, 0, JSON.stringify(fork));
    assert.equal(r.origin, 'fork');
    assert.ok(r.problems.some((p) => /branche/.test(p)));
    assert.ok(r.problems.some((p) => /titre/.test(p)));
    assert.ok(r.problems.some((p) => /label/.test(p)));
    assert.match(r.lines[0], /fork/);
  }
});

test('PR Dependabot non conforme : avertissement (code 0)', () => {
  const r = evaluatePullRequest({
    ...OK,
    branch: 'dependabot/npm_and_yarn/express-5.1.0',
    title: 'chore(deps): bump express from 5.0.0 to 5.1.0',
    body: '',
    labels: ['dependencies'],
    author: 'dependabot[bot]',
  });
  assert.equal(r.code, 0);
  assert.equal(r.origin, 'dependabot');
  assert.ok(r.problems.length > 0);
  assert.match(r.lines[0], /Dependabot/);
});
