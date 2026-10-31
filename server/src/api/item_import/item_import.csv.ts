/**
 * Normalisation du CSV d'import.
 *
 * Selon l'outil qui a produit le fichier, le parseur amont rend soit des
 * objets déjà découpés, soit une seule colonne contenant toute la ligne.
 * Ce module ramène le second cas au premier.
 */

import { splitCsvLine } from '../../shared/utils/importUtils';

export type CsvRow = Record<string, string>;

/** Séparateurs rencontrés, par ordre de priorité. */
const DELIMITERS = ['\t', ';', ','] as const;

/**
 * Reconnaît une ligne non découpée : une clé unique contenant une virgule
 * est en réalité l'en-tête entier.
 */
function isUnsplitHeader(keys: string[]): boolean {
  return keys.length === 1 && typeof keys[0] === 'string' && keys[0].includes(',');
}

function detectDelimiter(headerLine: string): string {
  return DELIMITERS.find((d) => headerLine.includes(d)) ?? ',';
}

/**
 * Découpe les lignes restées en une seule colonne.
 *
 * @returns les lignes normalisées, ou les lignes d'origine si elles
 *   l'étaient déjà
 */
export function normalizeCsvRows(rows: CsvRow[]): CsvRow[] {
  if (rows.length === 0) return rows;

  const keys = Object.keys(rows[0] ?? {});
  if (!isUnsplitHeader(keys)) return rows;

  const headerLine = keys[0];
  const delimiter = detectDelimiter(headerLine);
  const headers = headerLine.split(delimiter).map((h) => h.trim());

  const normalized = rows.map((row) => {
    const values = splitCsvLine(String(row[headerLine] || ''));

    return Object.fromEntries(
      headers.map((header, index) => [header, values[index] ?? '']),
    ) as CsvRow;
  });

  console.log(`Normalized CSV format with ${headers.length} columns`);

  return normalized;
}
