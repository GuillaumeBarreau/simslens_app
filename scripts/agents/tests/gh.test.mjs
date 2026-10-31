import assert from 'node:assert/strict';
import { test } from 'node:test';

import {
  dueDateFrom,
  finalTitle,
  labelsFor,
  normalizeTitle,
  parseAutonomy,
  validatePayload,
} from '../gh.mjs';

const AUTONOMY_MD = `
| Catégorie            | Niveau | Plafond | Remarque |
| -------------------- | :----: | :-----: | -------- |
| \`bug\`                |   N1   |   N3    |          |
| \`feature\`            |   N0   |   N2    |          |
| \`objective\`          |   N1   |   N1    |          |
`;
const autonomy = parseAutonomy(AUTONOMY_MD);

const ISSUE = {
  kind: 'issue',
  category: 'bug',
  type: 'Security',
  title: 'Valider reportID avant la mise en file',
  body: '## Contexte\n…',
  scopes: ['backend'],
  priority: 'high-priority',
};

test('parseAutonomy lit niveau et plafond', () => {
  assert.deepEqual(autonomy.bug, { level: 1, cap: 3 });
  assert.deepEqual(autonomy.feature, { level: 0, cap: 2 });
});

test('validatePayload accepte une issue conforme', () => {
  assert.deepEqual(validatePayload(ISSUE, autonomy), []);
});

test('validatePayload refuse ce qui ne respecte pas les règles', () => {
  const cases = [
    [{ category: 'feature', type: 'Feature' }, /N0/],
    [{ category: 'inconnue' }, /catégorie inconnue/],
    [{ type: 'Feat' }, /type inconnu/],
    [{ scopes: [] }, /périmètre requis/],
    [{ scopes: ['back'] }, /périmètre inconnu/],
    [{ priority: undefined }, /priorité requise/],
    [{ priority: 'urgent' }, /priorité inconnue/],
    [{ title: 'SIMS-071 : [Bug] x' }, /préfixe/],
    [{ title: 'x'.repeat(121) }, /trop long/],
    [{ body: ' ' }, /body manquant/],
  ];
  for (const [override, expected] of cases) {
    const errors = validatePayload({ ...ISSUE, ...override }, autonomy);
    assert.ok(
      errors.some((e) => expected.test(e)),
      `${JSON.stringify(override)} → ${errors}`,
    );
  }
});

test('objectif : catégorie objective, pas de type ni de périmètre requis', () => {
  const obj = {
    kind: 'objective',
    title: 'Soirée de raid sans surprise',
    body: 'Échéance : 2026-12-02',
  };
  assert.deepEqual(validatePayload(obj, autonomy), []);
  assert.deepEqual(labelsFor(obj), [
    'objective',
    'medium-priority',
    'agent:pending',
    'agent:authored',
  ]);
  assert.equal(finalTitle(140, obj), 'SIMS-140 : [Objectif] Soirée de raid sans surprise');
});

test('labels et titre d’une issue', () => {
  assert.deepEqual(labelsFor(ISSUE), [
    'security',
    'backend',
    'high-priority',
    'agent:pending',
    'agent:authored',
  ]);
  assert.equal(
    finalTitle(7, ISSUE),
    'SIMS-007 : [Security] Valider reportID avant la mise en file',
  );
});

test('normalizeTitle ignore préfixe SIMS, [Type], casse et espaces', () => {
  assert.equal(
    normalizeTitle('SIMS-071 : [Security]  Valider   reportID'),
    normalizeTitle('valider reportid'),
  );
});

test('dueDateFrom lit l’échéance d’un objectif', () => {
  assert.equal(dueDateFrom('**Échéance proposée** : 2026-12-02 (8 semaines)'), '2026-12-02');
  assert.equal(dueDateFrom('Echeance : 2026-11-18'), '2026-11-18');
  assert.equal(dueDateFrom('pas de date'), null);
});
