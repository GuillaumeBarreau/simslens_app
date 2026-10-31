/**
 * Vérification des données de référence au démarrage (SIMS-214).
 *
 * `classes` et `specializations` ne sont peuplées que par le seed
 * (`server/src/scripts/initData.js`). Une base déployée sans seed démarre sans
 * erreur, mais l'import de guilde, le choix de spécialisation et les wishlists
 * échouent ensuite sans cause lisible. On le signale dans les logs du serveur,
 * sans bloquer le démarrage.
 */

import { prisma } from '../../data';

interface ReferenceTableCounts {
  classes: number;
  specializations: number;
}

interface Logger {
  warn: (...args: unknown[]) => void;
}

/** Tables de référence vides, dans l'ordre de seed. */
export function findEmptyReferenceTables(counts: ReferenceTableCounts): string[] {
  return (Object.keys(counts) as (keyof ReferenceTableCounts)[]).filter(
    (table) => counts[table] === 0,
  );
}

/**
 * Compte les lignes des tables de référence et journalise un avertissement si
 * l'une est vide. Ne lève jamais : une base injoignable est déjà signalée ailleurs.
 * @returns les tables vides (vide si tout va bien ou si la vérification a échoué)
 */
export async function warnIfReferenceDataMissing(log: Logger = console): Promise<string[]> {
  try {
    const [classes, specializations] = await Promise.all([
      prisma.classes.count(),
      prisma.specializations.count(),
    ]);
    const empty = findEmptyReferenceTables({ classes, specializations });
    if (empty.length > 0) {
      log.warn(
        `⚠️  [ReferenceData] Table(s) de référence vide(s) : ${empty.join(', ')}. ` +
          'Lancez le seed (en local : npm run server:init-data ; dans le conteneur : node ./dist/scripts/initData.js, ' +
          'ou INIT_DATA_ON_START=1 au démarrage) : ' +
          "sans elles, l'import de guilde et le choix de spécialisation échouent.",
      );
    }
    return empty;
  } catch (err) {
    log.warn(
      '⚠️  [ReferenceData] Vérification des tables de référence impossible :',
      (err as Error).message,
    );
    return [];
  }
}
