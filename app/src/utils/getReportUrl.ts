const HEALER_SPEC_NAMES = ['Holy', 'Discipline', 'Restoration', 'Mistweaver', 'Preservation'];

export function isHealerSpec(spec?: string | null): boolean {
  if (!spec) return false;
  return HEALER_SPEC_NAMES.some((name) => spec.includes(name));
}

/**
 * Lien vers le rapport d'une sim : QE Live pour une sim `hps` (SIMS-202) ou,
 * règle historique, pour une spé de soin ; Raidbots sinon.
 */
export function getReportUrl(
  reportId: string,
  spec?: string | null,
  metric?: string | null,
): string {
  if (metric === 'hps' || isHealerSpec(spec)) {
    return `https://questionablyepic.com/live/upgradereport/${reportId}`;
  }
  return `https://www.raidbots.com/simbot/report/${reportId}`;
}
