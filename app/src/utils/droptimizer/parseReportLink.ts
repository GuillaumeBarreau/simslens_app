/**
 * Extrait l'identifiant d'un rapport depuis ce que l'utilisateur colle : URL Raidbots,
 * URL QuestionablyEpic, ou identifiant seul. Même règle que le serveur
 * (`^[A-Za-z0-9_-]{8,64}$`).
 */

export type ReportSource = 'raidbots' | 'qe';

export type ParsedReportLink =
  { ok: true; reportID: string; source: ReportSource } | { ok: false; reason: 'empty' | 'invalid' };

const REPORT_ID = /^[A-Za-z0-9_-]{8,64}$/;

export function parseReportLink(input: string): ParsedReportLink {
  const raw = input.trim();
  if (!raw) return { ok: false, reason: 'empty' };

  const raidbotsMatch = raw.match(/raidbots\.com\/(?:[^\s?#]*?)report\/([A-Za-z0-9_-]{8,64})/i);
  const qeMatch = raw.match(
    /questionablyepic\.com\/(?:live\/upgradereport\/|api\/getUpgradeReport\.php\?reportID=)([A-Za-z0-9_-]{8,64})/i,
  );

  let reportID: string;
  let source: ReportSource = 'raidbots';

  if (raidbotsMatch?.[1]) {
    reportID = raidbotsMatch[1];
  } else if (qeMatch?.[1]) {
    reportID = qeMatch[1];
    source = 'qe';
  } else {
    const cleaned = raw.replace(/[?#].*$/, '').replace(/\/+$/, '');
    const lastSeg = cleaned.match(/([^/]+)$/);
    reportID = lastSeg ? lastSeg[1] : raw;
  }

  reportID = reportID.replace(/^<|>$/g, '').replace(/^"|"$/g, '').trim();

  if (!REPORT_ID.test(reportID)) return { ok: false, reason: 'invalid' };
  return { ok: true, reportID, source };
}
