/**
 * Refus typés d'un import de rapport, renvoyés par le worker dans le statut
 * (`code`) : le front les affiche traduits plutôt que le message serveur.
 * SIMS-202 : un rapport QE Live doit se rattacher à une spé de soin du personnage.
 */
const REPORT_IMPORT_ERROR_CODES: readonly string[] = ['QE_NO_HEALER_SPEC', 'QE_NOT_HEALER_SPEC'];

/**
 * Clé de traduction (espace `tracking`) d'un refus connu ; null pour un code
 * absent ou inconnu, auquel cas le message du serveur est affiché tel quel.
 */
export function reportImportErrorKey(code?: string | null): string | null {
  return code && REPORT_IMPORT_ERROR_CODES.includes(code) ? `import.refused.${code}` : null;
}
