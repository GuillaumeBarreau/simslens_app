import { Tooltip } from '@mantine/core';
import { IconCheck, IconX } from '@tabler/icons-react';

export interface EnchantResult {
  isValid: boolean | null;
  reason: string;
  craftingQuality?: number | null;
  displayName?: string | null;
}

export type EnchantBySlot = Record<string, EnchantResult>;

export function mergeStatus(
  enchant: EnchantResult | undefined,
  gem: EnchantResult | undefined,
): { isValid: boolean; worstRank: number | null } | null {
  const active = [enchant, gem].filter(
    (r): r is EnchantResult => !!r && r.reason !== 'not_configured' && r.reason !== 'not_required',
  );
  if (active.length === 0) return null;
  if (active.some((r) => !r.isValid)) return { isValid: false, worstRank: null };
  const worstRank = active.some((r) => r.craftingQuality === 1) ? 1 : 2;
  return { isValid: true, worstRank };
}

export function buildTooltipLabel(
  enchant: EnchantResult | undefined,
  gem: EnchantResult | undefined,
): string | null {
  const lines: string[] = [];

  if (enchant && enchant.reason !== 'not_configured') {
    if (enchant.reason === 'missing') lines.push('Enchantement : manquant');
    else if (enchant.reason === 'invalid')
      lines.push(
        `Enchantement : invalide${enchant.displayName ? ` (${enchant.displayName})` : ''}`,
      );
    else if (enchant.isValid)
      lines.push(
        `Enchantement : ${enchant.displayName ?? 'valide'} (rang ${enchant.craftingQuality ?? '?'})`,
      );
  }

  if (gem && gem.reason !== 'not_configured' && gem.reason !== 'not_required') {
    if (gem.reason === 'missing') lines.push('Gemme : manquante');
    else if (gem.reason === 'invalid') lines.push('Gemme : invalide');
    else if (gem.isValid) lines.push(`Gemme : rang ${gem.craftingQuality ?? '?'}`);
  }

  return lines.join('\n') || null;
}

export function SlotStatusIndicator({
  enchantResult,
  gemResult,
}: {
  enchantResult?: EnchantResult;
  gemResult?: EnchantResult;
}) {
  const merged = mergeStatus(enchantResult, gemResult);
  if (!merged) return <div style={{ width: 14, flexShrink: 0 }} />;

  const color = !merged.isValid
    ? 'var(--mantine-color-red-5)'
    : merged.worstRank === 1
      ? 'var(--mantine-color-orange-5)'
      : 'var(--mantine-color-green-5)';

  const icon = merged.isValid ? (
    <IconCheck size={14} color={color} style={{ flexShrink: 0 }} />
  ) : (
    <IconX size={14} color={color} style={{ flexShrink: 0 }} />
  );

  const label = buildTooltipLabel(enchantResult, gemResult);
  if (!label) return icon;

  return (
    <Tooltip
      label={<span style={{ whiteSpace: 'pre-line' }}>{label}</span>}
      withArrow
      position="top"
    >
      <div style={{ display: 'flex', flexShrink: 0, cursor: 'default' }}>{icon}</div>
    </Tooltip>
  );
}
