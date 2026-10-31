import type { BossNote } from 'services/bossNote.service';

/**
 * Markdown minimal des notes de boss (SIMS-206), sans dépendance : titres
 * (`#` à `###`), listes (`-` ou `*`), paragraphes et gras (`**texte**`).
 * Le résultat est une structure de données rendue par des composants React,
 * qui échappent le texte : aucun HTML de la note n'est injecté dans la page.
 */

export interface InlineSpan {
  text: string;
  bold: boolean;
}

export type MarkdownBlock =
  | { type: 'heading'; level: 1 | 2 | 3; spans: InlineSpan[] }
  | { type: 'list'; items: InlineSpan[][] }
  | { type: 'paragraph'; lines: InlineSpan[][] };

const HEADING = /^(#{1,3})\s+(.*)$/;
const LIST_ITEM = /^[-*]\s+(.*)$/;

/** Découpe une ligne en segments, gras ou non, autour des paires de `**`. */
export function parseInline(line: string): InlineSpan[] {
  const parts = line.split('**');
  // Un nombre pair de segments signale un `**` sans fermeture : le dernier
  // est rendu tel quel, avec ses astérisques.
  const unclosed = parts.length % 2 === 0;
  const spans: InlineSpan[] = [];
  parts.forEach((text, index) => {
    const isLast = index === parts.length - 1;
    if (unclosed && isLast) {
      spans.push({ text: `**${text}`, bold: false });
      return;
    }
    if (text.length > 0) spans.push({ text, bold: index % 2 === 1 });
  });
  return spans;
}

export function parseMarkdownLite(content: string): MarkdownBlock[] {
  const blocks: MarkdownBlock[] = [];
  let current: MarkdownBlock | null = null;

  for (const rawLine of content.replace(/\r\n?/g, '\n').split('\n')) {
    const line = rawLine.trim();

    if (line.length === 0) {
      current = null;
      continue;
    }

    const heading = HEADING.exec(line);
    if (heading) {
      blocks.push({
        type: 'heading',
        level: heading[1].length as 1 | 2 | 3,
        spans: parseInline(heading[2]),
      });
      current = null;
      continue;
    }

    const item = LIST_ITEM.exec(line);
    if (item) {
      if (current?.type !== 'list') {
        current = { type: 'list', items: [] };
        blocks.push(current);
      }
      current.items.push(parseInline(item[1]));
      continue;
    }

    if (current?.type !== 'paragraph') {
      current = { type: 'paragraph', lines: [] };
      blocks.push(current);
    }
    current.lines.push(parseInline(line));
  }

  return blocks;
}

/**
 * Texte à copier pour Discord ou une note MRT : nom du boss, note telle que
 * saisie, puis une ligne par assignation. Les assignés qui ont quitté le
 * roster du boss sont omis.
 */
export function formatBossNoteText(
  bossName: string,
  note: Pick<BossNote, 'content' | 'assignments'>,
  assignmentsTitle: string,
): string {
  const sections = [`**${bossName}**`];
  const content = note.content.trim();
  if (content) sections.push(content);

  const lines = [...note.assignments]
    .filter((a) => a.isHolder)
    .sort((a, b) => a.position - b.position)
    .map((a) => `- ${a.characterName} : ${a.task}`);
  if (lines.length > 0) sections.push([`${assignmentsTitle}`, ...lines].join('\n'));

  return sections.join('\n\n');
}
