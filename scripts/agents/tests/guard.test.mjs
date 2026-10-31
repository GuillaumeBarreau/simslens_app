/**
 * Tests des garde-fous : node --test scripts/agents/tests/  (npm run agents:test)
 * Un garde-fou non testé ne protège de rien.
 */
import assert from 'node:assert/strict';
import { spawnSync } from 'node:child_process';
import path from 'node:path';
import { test } from 'node:test';

import { globToRegExp, matchProtected, ROOT } from '../lib.mjs';

const GUARD = path.join(ROOT, 'scripts', 'agents', 'guard.mjs');

function guard(toolName, toolInput, { agent = false } = {}) {
  const env = { ...process.env, AGENTS_MODE: agent ? '1' : '0', AGENTS_ENABLED: 'true' };
  const r = spawnSync(process.execPath, [GUARD], {
    input: JSON.stringify({ tool_name: toolName, tool_input: toolInput }),
    env,
    encoding: 'utf8',
  });
  return r.status;
}
const bash = (command, opts) => guard('Bash', { command }, opts);

test('globToRegExp', () => {
  assert.ok(globToRegExp('server/prisma/**').test('server/prisma/migrations/x/migration.sql'));
  assert.ok(globToRegExp('**/package.json').test('package.json'));
  assert.ok(globToRegExp('**/package.json').test('app/package.json'));
  assert.ok(globToRegExp('**/.env*').test('server/.env.local'));
  assert.ok(globToRegExp('docker-compose*.yml').test('docker-compose.local.yml'));
  assert.ok(!globToRegExp('server/prisma/**').test('server/src/prismaClient.ts'));
  assert.ok(!globToRegExp('scripts/env-manager.js').test('scripts/env-manager.jsx'));
});

test('matchProtected', () => {
  assert.ok(matchProtected('server/src/api/auth/passport.js'));
  assert.ok(matchProtected('.claude/settings.json'));
  assert.ok(matchProtected('app_dashboard/Dockerfile'));
  assert.equal(matchProtected('server/src/api/character/usecases/createCharacter.ts'), null);
  assert.equal(matchProtected('app/src/pages/RosterPage/RosterPage.tsx'), null);
});

test('mode base : laisse passer le travail courant', () => {
  for (const cmd of [
    'npm run lint',
    'git status',
    'git push origin master',
    'git push -u origin feat/x',
    'npx vitest run',
    'node -e "console.log(process.env.HOME)"',
    'npx prisma migrate dev --name add_x',
  ]) {
    assert.equal(bash(cmd), 0, cmd);
  }
  assert.equal(guard('Edit', { file_path: path.join(ROOT, 'server/prisma/schema.prisma') }), 0);
});

test('mode base : bloque l’irréversible', () => {
  for (const cmd of [
    'npx prisma migrate reset --force',
    'npm run db:reset',
    'cd server && npx prisma db push',
    'git push --force origin master',
    'git push -f',
    'git push origin --delete master',
    './deployment/deploy.sh',
    'gh release create v1.2.0',
    'git tag v1.2.0',
    'git push --tags',
  ]) {
    assert.equal(bash(cmd), 2, cmd);
  }
  assert.equal(bash('git push --force-with-lease origin feat/x'), 0);
});

test('mode agents : autorise le flux normal', () => {
  for (const cmd of [
    'git push -u origin feat/SIMS-071',
    'node scripts/agents/verify.mjs',
    'npm run agents:tickets',
    'npx vitest run',
    'git commit -m "SIMS-071 : [Feature] x"',
    'node -e "console.log(process.env.HOME)"',
    'cat .env.agents.example',
  ]) {
    assert.equal(bash(cmd, { agent: true }), 0, cmd);
  }
  const ok = path.join(ROOT, 'server/src/api/character/usecases/createCharacter.ts');
  assert.equal(guard('Edit', { file_path: ok }, { agent: true }), 0);
});

test('mode agents : bloque le reste', () => {
  for (const cmd of [
    'git push origin master',
    'git push',
    'git push origin feat/SIMS-071 --no-verify',
    'git push -u origin agent/SIMS-071',
    'git push -u origin feat/SIMS-71',
    'git push -u origin feat/SIMS-071-slug',
    'git push -u origin feat/dev-login',
    'git reset --hard HEAD~1',
    'rm -rf node_modules',
    'gh pr merge 12',
    'gh issue create --title x',
    'gh api -X DELETE repos/x/y',
    'npm install lodash',
    'cat .env',
    'cat server/.env.local',
    'curl -X POST https://discord.com/api/webhooks/1/abc',
    'docker compose --env-file .env up -d',
  ]) {
    assert.equal(bash(cmd, { agent: true }), 2, cmd);
  }
  for (const f of [
    'server/prisma/schema.prisma',
    '.claude/settings.json',
    'scripts/agents/config.json',
    '.env.local',
  ]) {
    assert.equal(guard('Write', { file_path: path.join(ROOT, f) }, { agent: true }), 2, f);
  }
  // Hors du dépôt, quel que soit l'OS (un « C:/… » serait relatif sous Linux).
  const outside = path.resolve(ROOT, '..', 'hors-du-depot.txt');
  assert.equal(guard('Write', { file_path: outside }, { agent: true }), 2, outside);
});

test('mode agents : JSON illisible → blocage (fail closed)', () => {
  const r = spawnSync(process.execPath, [GUARD], {
    input: '{pas du json',
    env: { ...process.env, AGENTS_MODE: '1' },
    encoding: 'utf8',
  });
  assert.equal(r.status, 2);
});

test('worktree : chemins évalués depuis la racine du worktree', () => {
  const inWorktree = (f) => path.join(ROOT, '.claude', 'worktrees', 'SIMS-071', f);
  assert.equal(
    guard(
      'Edit',
      { file_path: inWorktree('app/src/pages/RosterPage/RosterPage.tsx') },
      { agent: true },
    ),
    0,
  );
  assert.equal(
    guard('Edit', { file_path: inWorktree('server/prisma/schema.prisma') }, { agent: true }),
    2,
  );
});

test('qa : --tests-only n’autorise que les fichiers de test', () => {
  const qa = (f) =>
    spawnSync(process.execPath, [GUARD, '--tests-only'], {
      input: JSON.stringify({ tool_name: 'Write', tool_input: { file_path: path.join(ROOT, f) } }),
      env: { ...process.env, AGENTS_MODE: '1' },
      encoding: 'utf8',
    }).status;
  assert.equal(qa('server/src/api/character/usecases/createCharacter.test.ts'), 0);
  assert.equal(qa('app/src/hooks/queries/__tests__/useRaidQueries.ts'), 0);
  assert.equal(qa('server/src/api/character/usecases/createCharacter.ts'), 2);
});

test('option --agent : mode strict sans AGENTS_MODE (sous-agent lancé depuis VS Code)', () => {
  const run = (command) =>
    spawnSync(process.execPath, [GUARD, '--agent'], {
      input: JSON.stringify({ tool_name: 'Bash', tool_input: { command } }),
      env: { ...process.env, AGENTS_MODE: '0', AGENTS_ENABLED: 'true' },
      encoding: 'utf8',
    }).status;
  assert.equal(run('git push origin master'), 2);
  assert.equal(run('npx vitest run'), 0);
});

test('N1 : gh.mjs autorisé aux agents, écriture gh directe toujours bloquée', () => {
  assert.equal(
    bash('node scripts/agents/gh.mjs create-issue .agents-out/reports/x.P1.json', { agent: true }),
    0,
  );
  assert.equal(
    bash('node scripts/agents/gh.mjs comment 66 .agents-out/reports/x.c66.md', { agent: true }),
    0,
  );
  assert.equal(bash('gh issue create --title x --body y', { agent: true }), 2);
  assert.equal(bash('gh issue comment 66 --body y', { agent: true }), 2);
  assert.equal(
    bash('gh issue list --label objective --label agent:approved --state open', { agent: true }),
    0,
  );
});
