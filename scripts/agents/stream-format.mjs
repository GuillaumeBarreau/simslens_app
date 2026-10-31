/**
 * Met en forme les événements `--output-format stream-json` de Claude Code en lignes
 * lisibles, pour suivre un cycle en direct (run-cycle.mjs, watch.mjs).
 *
 * Un événement par ligne JSON : `system` (init), `assistant` (texte, appels d'outils),
 * `user` (résultats d'outils), `result` (fin). Les messages des sous-agents portent un
 * `parent_tool_use_id` : ils sont indentés sous l'agent qui les a lancés.
 */

const MAX_TEXT = 220;
const MAX_ARG = 120;

const oneLine = (s, max) => {
  const t = String(s ?? '')
    .replace(/\s+/g, ' ')
    .trim();
  return t.length > max ? `${t.slice(0, max - 1)}…` : t;
};

const hhmmss = (date = new Date()) => date.toTimeString().slice(0, 8);

/** Résumé court de l'argument principal d'un appel d'outil. */
function toolArg(name, input = {}) {
  if (name === 'Agent' || name === 'Task') {
    return `${input.subagent_type || 'agent'} — ${input.description || ''}`;
  }
  const value =
    input.command ||
    input.file_path ||
    input.pattern ||
    input.query ||
    input.url ||
    input.skill ||
    input.description ||
    '';
  return oneLine(value, MAX_ARG);
}

/**
 * @param {object} event  un événement stream-json
 * @param {Date} [now]
 * @returns {string[]} lignes à afficher (éventuellement aucune)
 */
export function formatEvent(event, now = new Date()) {
  const t = hhmmss(now);
  const indent = event.parent_tool_use_id ? '    ↳ ' : '';
  const lines = [];

  if (event.type === 'system' && event.subtype === 'init') {
    lines.push(`${t} ▶️  Session ${event.session_id || ''} (modèle ${event.model || '?'})`);
  }

  if (event.type === 'assistant' && Array.isArray(event.message?.content)) {
    for (const part of event.message.content) {
      if (part.type === 'tool_use') {
        const icon = part.name === 'Agent' || part.name === 'Task' ? '🤖' : '🔧';
        lines.push(`${t} ${indent}${icon} ${part.name} ${toolArg(part.name, part.input)}`);
      } else if (part.type === 'text' && part.text.trim()) {
        lines.push(`${t} ${indent}💬 ${oneLine(part.text, MAX_TEXT)}`);
      }
    }
  }

  if (event.type === 'user' && Array.isArray(event.message?.content)) {
    for (const part of event.message.content) {
      if (part.type === 'tool_result' && part.is_error) {
        const content = Array.isArray(part.content)
          ? part.content.map((c) => c.text || '').join(' ')
          : part.content;
        lines.push(`${t} ${indent}⛔ ${oneLine(content, MAX_TEXT)}`);
      }
    }
  }

  if (event.type === 'result') {
    // Une session -p rend la main puis reprend à chaque fin de sous-agent en arrière-plan :
    // plusieurs `result` par cycle. La fin du cycle est annoncée par run-cycle.mjs.
    const minutes = event.duration_ms ? `${Math.round(event.duration_ms / 60000)} min` : '?';
    const ok = event.subtype === 'success' && !event.is_error;
    lines.push(
      `${t} ${ok ? '⏸' : '❌'} Étape terminée (${event.subtype || '?'}) — ${minutes}, ${event.num_turns ?? '?'} tours`,
    );
    // Commandes refusées par les permissions : à corriger (prompt ou liste autorisée).
    const denials = event.permission_denials || [];
    if (denials.length) {
      lines.push(`${t} ⚠️ ${denials.length} appel(s) d'outil refusé(s) par les permissions :`);
      for (const d of denials) {
        const input = d.tool_input || {};
        const what = input.command || input.file_path || input.pattern || '';
        lines.push(`${t}    - ${d.tool_name} ${oneLine(what, MAX_ARG)}`);
      }
    }
  }

  return lines;
}

/** Découpe un flux texte en lignes JSON complètes ; renvoie le reste incomplet. */
export function splitJsonLines(buffer) {
  const parts = buffer.split('\n');
  const rest = parts.pop();
  const events = [];
  for (const line of parts) {
    if (!line.trim()) continue;
    try {
      events.push(JSON.parse(line));
    } catch {
      /* ligne non JSON (avertissement) : ignorée */
    }
  }
  return { events, rest };
}
