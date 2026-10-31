export type InviteCodeStatus = 'active' | 'expired' | 'exhausted';

export interface InviteCodeLike {
  expiresAt: string | null;
  maxUses: number;
  useCount: number;
}

export function getInviteCodeStatus(
  code: InviteCodeLike,
  now: Date = new Date(),
): InviteCodeStatus {
  if (code.expiresAt && new Date(code.expiresAt).getTime() <= now.getTime()) return 'expired';
  if (code.useCount >= code.maxUses) return 'exhausted';
  return 'active';
}

export function buildInviteLink(origin: string, code: string): string {
  return `${origin.replace(/\/+$/, '')}/invite/${encodeURIComponent(code)}`;
}

export function splitInviteCodes<T extends InviteCodeLike>(
  codes: T[],
  now: Date = new Date(),
): { active: T[]; inactive: T[] } {
  const active: T[] = [];
  const inactive: T[] = [];
  for (const code of codes) {
    (getInviteCodeStatus(code, now) === 'active' ? active : inactive).push(code);
  }
  return { active, inactive };
}

export function toInviteExpiryPayload(date: string | null): string | null {
  if (!date) return null;
  const [year, month, day] = date.split('-').map(Number);
  if (!year || !month || !day) return null;
  return new Date(year, month - 1, day, 23, 59, 59).toISOString();
}
