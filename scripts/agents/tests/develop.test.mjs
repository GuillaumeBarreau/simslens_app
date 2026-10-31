import assert from 'node:assert/strict';
import { test } from 'node:test';

import { planRun, prBody, prLabels } from '../run-develop.mjs';

const issue = (number, labels) => ({ number, title: `SIMS-${number} : [Bug] t`, labels });

test('planRun : refusées à fermer, objectifs validés, issues validées à développer', () => {
  const plan = planRun(
    [
      issue(10, ['agent:pending', 'bug']),
      issue(11, ['agent:rejected', 'bug']),
      issue(12, ['agent:approved', 'objective']),
      issue(13, ['agent:approved', 'bug', 'low-priority']),
      issue(14, ['agent:approved', 'bug', 'high-priority']),
      // refus prioritaire sur une validation restée en place
      issue(15, ['agent:approved', 'agent:rejected']),
    ],
    { slots: 5 },
  );
  assert.deepEqual(
    plan.reject.map((i) => i.number),
    [11, 15],
  );
  assert.deepEqual(
    plan.objectives.map((i) => i.number),
    [12],
  );
  // priorité haute d'abord, l'issue en attente n'est pas touchée
  assert.deepEqual(
    plan.develop.map((i) => i.number),
    [14, 13],
  );
});

test('planRun : issues déjà prises ou reprises par un humain ignorées', () => {
  const plan = planRun(
    [
      issue(20, ['agent:approved', 'human:takeover']),
      issue(21, ['agent:approved', 'agent:in-progress']),
      issue(22, ['agent:approved', 'agent:blocked']),
    ],
    { slots: 5 },
  );
  assert.deepEqual(plan.develop, []);
  assert.equal(plan.skipped.length, 3);
});

test('planRun : limité par les places de PR, à ancienneté égale le plus vieux d’abord', () => {
  const plan = planRun(
    [issue(31, ['agent:approved']), issue(30, ['agent:approved']), issue(32, ['agent:approved'])],
    { slots: 2 },
  );
  assert.deepEqual(
    plan.develop.map((i) => i.number),
    [30, 31],
  );
  assert.equal(plan.skipped[0].issue.number, 32);
  assert.deepEqual(planRun([issue(40, ['agent:approved'])], { slots: -1 }).develop, []);
});

test('prLabels garde type, périmètre et priorité, pas les statuts', () => {
  assert.deepEqual(
    prLabels(['agent:approved', 'agent:authored', 'bug', 'backend', 'high-priority', 'objective']),
    ['bug', 'backend', 'high-priority'],
  );
});

test('prBody commence par Closes #N, sans doublon, et sans signature', () => {
  const body = prBody(42, 'Closes #42\n\n## Résumé\nx', '| ok |');
  assert.match(body, /^Closes #42\n/);
  assert.equal(body.match(/Closes #42/g).length, 1);
  assert.match(body, /## Résumé/);
  assert.match(body, /\| ok \|/);
  assert.doesNotMatch(body, /claude/i);
  assert.match(prBody(7, '', 'v'), /non fourni/);
});
