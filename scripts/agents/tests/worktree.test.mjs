import assert from 'node:assert/strict';
import fs from 'node:fs';
import os from 'node:os';
import path from 'node:path';
import { test } from 'node:test';

import {
  copyClaudeConfig,
  findLinks,
  linkNodeModules,
  unlinkNodeModules,
  worktreePath,
} from '../worktree.mjs';

function tmp() {
  return fs.mkdtempSync(path.join(os.tmpdir(), 'wt-test-'));
}

test('worktreePath : dossier frère nommé SIMS-NNN', () => {
  assert.equal(
    worktreePath(7, path.join('C:', 'x', 'repo')),
    path.join('C:', 'x', 'repo-SIMS-007'),
  );
});

test('les junctions node_modules sont retirées sans toucher à leur cible', () => {
  const base = tmp();
  const root = path.join(base, 'repo');
  const wt = path.join(base, 'repo-SIMS-001');
  for (const d of ['', 'app']) {
    fs.mkdirSync(path.join(root, d, 'node_modules', 'pkg'), { recursive: true });
    fs.writeFileSync(path.join(root, d, 'node_modules', 'pkg', 'index.js'), 'x');
    fs.mkdirSync(path.join(wt, d), { recursive: true });
  }

  linkNodeModules(wt, root);
  assert.equal(findLinks(wt).length, 2);

  assert.deepEqual(unlinkNodeModules(wt), []);
  assert.ok(!fs.existsSync(path.join(wt, 'node_modules')));
  assert.ok(fs.existsSync(path.join(root, 'node_modules', 'pkg', 'index.js')));
  assert.ok(fs.existsSync(path.join(root, 'app', 'node_modules', 'pkg', 'index.js')));
  fs.rmSync(base, { recursive: true, force: true });
});

test('.claude/ est copié dans le worktree, sans les fichiers personnels', () => {
  const base = tmp();
  const root = path.join(base, 'repo');
  const wt = path.join(base, 'repo-SIMS-001');
  const claude = path.join(root, '.claude');
  fs.mkdirSync(path.join(claude, 'agents'), { recursive: true });
  fs.mkdirSync(path.join(claude, 'worktrees', 'old'), { recursive: true });
  fs.writeFileSync(path.join(claude, 'settings.json'), '{}');
  fs.writeFileSync(path.join(claude, 'agents', 'developer.md'), 'x');
  fs.writeFileSync(path.join(claude, 'settings.local.json'), '{}');
  fs.writeFileSync(path.join(claude, 'agents.disabled'), '');
  fs.mkdirSync(wt);

  copyClaudeConfig(wt, root);
  const copied = path.join(wt, '.claude');
  assert.ok(fs.existsSync(path.join(copied, 'settings.json')));
  assert.ok(fs.existsSync(path.join(copied, 'agents', 'developer.md')));
  assert.ok(!fs.existsSync(path.join(copied, 'settings.local.json')));
  assert.ok(!fs.existsSync(path.join(copied, 'worktrees')));
  assert.ok(!fs.existsSync(path.join(copied, 'agents.disabled')));
  assert.deepEqual(findLinks(wt), []);
  fs.rmSync(base, { recursive: true, force: true });
});

test('un lien ailleurs que sur node_modules est signalé et non suivi', () => {
  const base = tmp();
  const target = path.join(base, 'target');
  const wt = path.join(base, 'wt');
  fs.mkdirSync(path.join(target, 'deep'), { recursive: true });
  fs.mkdirSync(path.join(wt, 'sub'), { recursive: true });
  fs.symlinkSync(target, path.join(wt, 'sub', 'stray'), 'junction');

  const left = unlinkNodeModules(wt);
  assert.deepEqual(left, [path.join(wt, 'sub', 'stray')]);
  assert.ok(fs.existsSync(path.join(target, 'deep')));
  fs.unlinkSync(path.join(wt, 'sub', 'stray'));
  fs.rmSync(base, { recursive: true, force: true });
});
