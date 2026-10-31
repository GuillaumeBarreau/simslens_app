export const classColors = {
  warrior: '#c79c6e',
  paladin: '#f58cba',
  hunter: '#abd473',
  rogue: '#fff569',
  priest: '#ffffff',
  death_knight: '#c41f3b',
  shaman: '#0070de',
  mage: '#40c7eb',
  warlock: '#8787ed',
  monk: '#00ff96',
  druid: '#ff7d0a',
  demon_hunter: '#a330c9',
  evoker: '#33937f',
} as const;

export type ClassColor = keyof typeof classColors;
