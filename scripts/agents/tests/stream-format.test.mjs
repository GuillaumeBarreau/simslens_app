import assert from 'node:assert/strict';
import { test } from 'node:test';

import { formatEvent, splitJsonLines } from '../stream-format.mjs';

const NOW = new Date(2026, 9, 7, 13, 17, 4);

test('init, texte et appel d’outil', () => {
  assert.deepEqual(
    formatEvent({ type: 'system', subtype: 'init', session_id: 'abc', model: 'opus' }, NOW),
    ['13:17:04 ▶️  Session abc (modèle opus)'],
  );
  const lines = formatEvent(
    {
      type: 'assistant',
      parent_tool_use_id: null,
      message: {
        content: [
          { type: 'text', text: 'Je lance\nl’audit.' },
          { type: 'tool_use', name: 'Bash', input: { command: 'npm run agents:tickets' } },
        ],
      },
    },
    NOW,
  );
  assert.deepEqual(lines, [
    '13:17:04 💬 Je lance l’audit.',
    '13:17:04 🔧 Bash npm run agents:tickets',
  ]);
});

test('sous-agent : lancement et messages indentés', () => {
  const [launch] = formatEvent(
    {
      type: 'assistant',
      message: {
        content: [
          {
            type: 'tool_use',
            name: 'Agent',
            input: { subagent_type: 'auditor', description: 'Audit server-api' },
          },
        ],
      },
    },
    NOW,
  );
  assert.equal(launch, '13:17:04 🤖 Agent auditor — Audit server-api');
  const [child] = formatEvent(
    {
      type: 'assistant',
      parent_tool_use_id: 'toolu_1',
      message: { content: [{ type: 'tool_use', name: 'Read', input: { file_path: 'CLAUDE.md' } }] },
    },
    NOW,
  );
  assert.equal(child, '13:17:04     ↳ 🔧 Read CLAUDE.md');
});

test('erreur d’outil et fin', () => {
  const [err] = formatEvent(
    {
      type: 'user',
      message: {
        content: [{ type: 'tool_result', is_error: true, content: '⛔ Bloqué par guard' }],
      },
    },
    NOW,
  );
  assert.equal(err, '13:17:04 ⛔ ⛔ Bloqué par guard');
  assert.deepEqual(
    formatEvent(
      { type: 'result', subtype: 'success', is_error: false, duration_ms: 540000, num_turns: 12 },
      NOW,
    ),
    ['13:17:04 ⏸ Étape terminée (success) — 9 min, 12 tours'],
  );
});

test('textes longs tronqués, événements inconnus ignorés', () => {
  const [line] = formatEvent(
    { type: 'assistant', message: { content: [{ type: 'text', text: 'x'.repeat(500) }] } },
    NOW,
  );
  assert.ok(line.length < 250 && line.endsWith('…'));
  assert.deepEqual(formatEvent({ type: 'stream_event' }, NOW), []);
});

test('découpage du flux en lignes JSON', () => {
  const { events, rest } = splitJsonLines(
    '{"type":"a"}\nWarning: bruit\n{"type":"b"}\n{"type":"c"',
  );
  assert.deepEqual(
    events.map((e) => e.type),
    ['a', 'b'],
  );
  assert.equal(rest, '{"type":"c"');
});

test('fin de cycle : liste les appels refusés par les permissions', () => {
  const lines = formatEvent(
    {
      type: 'result',
      subtype: 'success',
      duration_ms: 60000,
      num_turns: 3,
      permission_denials: [{ tool_name: 'Bash', tool_input: { command: 'cd server && npx tsc' } }],
    },
    NOW,
  );
  assert.equal(lines.length, 3);
  assert.match(lines[1], /1 appel\(s\) d'outil refusé\(s\)/);
  assert.equal(lines[2], '13:17:04    - Bash cd server && npx tsc');
});
