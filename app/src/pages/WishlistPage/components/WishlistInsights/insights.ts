import type { WishState } from 'types/character.types';

export const WISH_STATE_COLORS: Record<WishState, string> = {
  equipped: 'orange',
  equipped_upgrade: 'teal',
  no_gain: 'orange',
  upgrade: 'teal',
  not_simulated: 'gray',
  not_wanted: 'dark',
};

/** Gain arrondi au DPS et pourcentage à une décimale, pour l'affichage. */
export function formatGain(dpsGain: number | null, gainPercent: number | null) {
  return {
    gain: dpsGain == null ? '' : Math.round(dpsGain).toLocaleString(),
    percent: gainPercent == null ? '0' : gainPercent.toFixed(1),
  };
}
