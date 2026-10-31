import trackingEn from '../../locales/en/tracking.json';
import trackingFr from '../../locales/fr/tracking.json';
import { getReportUrl } from '../getReportUrl';
import {
  getReportFreshness,
  parseReportLink,
  parseReportTimestamp,
  REPORT_STALE_DAYS,
  reportAgeDays,
  reportImportErrorKey,
  resolveStaleAfterDays,
  simMetricOf,
} from './index';

const DAY = 24 * 60 * 60 * 1000;
const NOW = Date.UTC(2026, 9, 7, 12);

describe('getReportFreshness', () => {
  it('classe selon les seuils 3 et 7 jours', () => {
    expect(getReportFreshness(NOW - 2.9 * DAY, NOW)).toBe('fresh');
    expect(getReportFreshness(NOW - 3 * DAY, NOW)).toBe('late');
    expect(getReportFreshness(NOW - 6.9 * DAY, NOW)).toBe('late');
    expect(getReportFreshness(NOW - 7 * DAY, NOW)).toBe('stale');
  });

  it('accepte un horodatage en secondes', () => {
    expect(getReportFreshness(Math.floor((NOW - DAY) / 1000), NOW)).toBe('fresh');
    expect(reportAgeDays(Math.floor((NOW - 2 * DAY) / 1000), NOW)).toBeCloseTo(2, 3);
  });

  it('lit une date ISO ou un objet Date (réponses de /upgrade)', () => {
    expect(getReportFreshness(new Date(NOW - DAY).toISOString(), NOW)).toBe('fresh');
    expect(getReportFreshness(new Date(NOW - 8 * DAY), NOW)).toBe('stale');
    expect(getReportFreshness(String(Math.floor((NOW - 4 * DAY) / 1000)), NOW)).toBe('late');
  });

  it('applique le seuil de péremption de la guilde (SIMS-199)', () => {
    expect(getReportFreshness(NOW - 5 * DAY, NOW, 14)).toBe('late');
    expect(getReportFreshness(NOW - 14 * DAY, NOW, 14)).toBe('stale');
    expect(getReportFreshness(NOW - 5 * DAY, NOW, 5)).toBe('stale');
    // Seuil plus court que la fenêtre « à jour » : pas d'état intermédiaire.
    expect(getReportFreshness(NOW - 1.5 * DAY, NOW, 2)).toBe('fresh');
    expect(getReportFreshness(NOW - 2 * DAY, NOW, 2)).toBe('stale');
  });

  it('signale un rapport absent', () => {
    expect(getReportFreshness(null, NOW)).toBe('missing');
    expect(getReportFreshness(undefined, NOW)).toBe('missing');
    expect(getReportFreshness(0, NOW)).toBe('missing');
    expect(getReportFreshness('pas une date', NOW)).toBe('missing');
    expect(getReportFreshness('', NOW)).toBe('missing');
    expect(parseReportTimestamp(new Date(Number.NaN))).toBeNull();
  });
});

describe('resolveStaleAfterDays', () => {
  it('retient un entier positif, sinon le seuil par défaut', () => {
    expect(resolveStaleAfterDays(10)).toBe(10);
    expect(resolveStaleAfterDays(undefined)).toBe(REPORT_STALE_DAYS);
    expect(resolveStaleAfterDays(0)).toBe(REPORT_STALE_DAYS);
    expect(resolveStaleAfterDays(-3)).toBe(REPORT_STALE_DAYS);
    expect(resolveStaleAfterDays(2.5)).toBe(REPORT_STALE_DAYS);
    expect(resolveStaleAfterDays('7')).toBe(REPORT_STALE_DAYS);
  });
});

describe('parseReportLink', () => {
  it('lit une URL de rapport Raidbots', () => {
    expect(parseReportLink('https://www.raidbots.com/simbot/report/abcDEF123456xyz')).toEqual({
      ok: true,
      reportID: 'abcDEF123456xyz',
      source: 'raidbots',
    });
  });

  it('lit une URL QuestionablyEpic', () => {
    expect(parseReportLink('https://questionablyepic.com/live/upgradereport/Qe_Report-01')).toEqual(
      { ok: true, reportID: 'Qe_Report-01', source: 'qe' },
    );
  });

  it('accepte un identifiant seul, entouré d’espaces ou de chevrons', () => {
    expect(parseReportLink('  <abcdefgh12>  ')).toEqual({
      ok: true,
      reportID: 'abcdefgh12',
      source: 'raidbots',
    });
  });

  it('refuse une saisie vide ou invalide', () => {
    expect(parseReportLink('   ')).toEqual({ ok: false, reason: 'empty' });
    expect(parseReportLink('court')).toEqual({ ok: false, reason: 'invalid' });
    expect(parseReportLink('https://example.com/a b c')).toEqual({ ok: false, reason: 'invalid' });
  });
});

// SIMS-202 : sims QE Live des soigneurs (gains HPS).
describe('simMetricOf', () => {
  it('« hps » seulement si la sim le dit, « dps » sinon', () => {
    expect(simMetricOf('hps')).toBe('hps');
    expect(simMetricOf('dps')).toBe('dps');
    expect(simMetricOf(null)).toBe('dps');
    expect(simMetricOf(undefined)).toBe('dps');
    expect(simMetricOf('autre')).toBe('dps');
  });
});

describe('reportImportErrorKey', () => {
  const CODES = ['QE_NO_HEALER_SPEC', 'QE_NOT_HEALER_SPEC'];

  it('traduit les refus typés du serveur', () => {
    expect(reportImportErrorKey('QE_NO_HEALER_SPEC')).toBe('import.refused.QE_NO_HEALER_SPEC');
  });

  it('laisse le message serveur pour un code absent ou inconnu', () => {
    expect(reportImportErrorKey(undefined)).toBeNull();
    expect(reportImportErrorKey('')).toBeNull();
    expect(reportImportErrorKey('P2003')).toBeNull();
    // Code retiré : une spé de soin non déclarée est désormais acceptée.
    expect(reportImportErrorKey('QE_HEALER_SPEC_NOT_DECLARED')).toBeNull();
  });

  it.each([
    ['fr', trackingFr],
    ['en', trackingEn],
  ])('chaque refus a un texte en %s', (_lang, locale) => {
    for (const code of CODES) {
      expect(locale.import.refused[code as keyof typeof locale.import.refused]).toBeTruthy();
    }
  });
});

describe('getReportUrl', () => {
  it('ouvre QE Live pour une sim « hps », même sans spé de soin reconnue', () => {
    expect(getReportUrl('abc', 'Restoration', 'hps')).toContain('questionablyepic.com');
    expect(getReportUrl('abc', null, 'hps')).toContain('questionablyepic.com');
  });

  it('garde la règle historique sans grandeur', () => {
    expect(getReportUrl('abc', 'Holy Priest')).toContain('questionablyepic.com');
    expect(getReportUrl('abc', 'Fire Mage', 'dps')).toContain('raidbots.com');
  });
});
