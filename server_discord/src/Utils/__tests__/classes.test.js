import { afterEach, describe, expect, it, vi } from 'vitest';

import { formatEntry } from '../../api/discord/raid.controller.js';
import {
  buildClassSelect,
  classMenuOptions,
  DEFAULT_CLASSES,
  fetchPlayableClasses,
} from '../classes.js';

// Classes jouables renvoyées par le serveur (registre server/src/shared/game/games.ts).
const RETAIL = [
  'warrior',
  'paladin',
  'hunter',
  'rogue',
  'priest',
  'death_knight',
  'shaman',
  'mage',
  'warlock',
  'monk',
  'druid',
  'demon_hunter',
  'evoker',
];
const FOREVER = [
  'warrior',
  'paladin',
  'hunter',
  'rogue',
  'priest',
  'shaman',
  'mage',
  'warlock',
  'druid',
];

// Menu Retail tel qu'il était codé en dur avant SIMS-026.
const RETAIL_MENU = [
  ['Guerrier', 'warrior', '⚔️'],
  ['Paladin', 'paladin', '🛡️'],
  ['Chasseur', 'hunter', '🏹'],
  ['Voleur', 'rogue', '🗡️'],
  ['Prêtre', 'priest', '✨'],
  ['Chaman', 'shaman', '⚡'],
  ['Mage', 'mage', '🔥'],
  ['Démoniste', 'warlock', '🌑'],
  ['Moine', 'monk', '🥋'],
  ['Druide', 'druid', '🌿'],
  ['Chevalier de la mort', 'death_knight', '💀'],
  ['Chasseur de démons', 'demon_hunter', '👿'],
  ['Évocateur', 'evoker', '🐉'],
];

afterEach(() => {
  vi.restoreAllMocks();
});

describe('classMenuOptions', () => {
  it('keeps the Retail menu unchanged: same 13 classes, labels, emojis and order', () => {
    const options = classMenuOptions(RETAIL);
    expect(options.map((o) => [o.label, o.value, o.emoji])).toEqual(RETAIL_MENU);
  });

  it('offers only the 9 vanilla classes for WoW Forever, in the menu order', () => {
    const options = classMenuOptions(FOREVER);
    expect(options.map((o) => o.value)).toEqual([
      'warrior',
      'paladin',
      'hunter',
      'rogue',
      'priest',
      'shaman',
      'mage',
      'warlock',
      'druid',
    ]);
    expect(options.map((o) => o.value)).not.toContain('death_knight');
    expect(options.map((o) => o.value)).not.toContain('monk');
  });

  it('keeps a class unknown to the display table, labelled by its name and without emoji', () => {
    const options = classMenuOptions(['warrior', 'tinker']);
    expect(options).toEqual([
      { value: 'warrior', label: 'Guerrier', emoji: '⚔️' },
      { value: 'tinker', label: 'tinker' },
    ]);
  });

  it('ignores duplicates', () => {
    expect(classMenuOptions(['mage', 'mage']).map((o) => o.value)).toEqual(['mage']);
  });
});

describe('buildClassSelect', () => {
  it('builds the guest class menu of the event with the given classes', () => {
    const json = buildClassSelect(42, FOREVER).toJSON();
    expect(json.custom_id).toBe('guest_class_42');
    expect(json.placeholder).toBe('Choisir une classe');
    expect(json.options).toHaveLength(9);
    expect(json.options[0]).toMatchObject({
      label: 'Guerrier',
      value: 'warrior',
      emoji: { name: '⚔️' },
    });
  });

  it('builds the 13-class menu for Retail', () => {
    const json = buildClassSelect(42, RETAIL).toJSON();
    expect(json.options.map((o) => [o.label, o.value, o.emoji?.name])).toEqual(RETAIL_MENU);
  });

  it('adds no emoji to an unknown class', () => {
    const json = buildClassSelect(1, ['tinker']).toJSON();
    expect(json.options[0]).toMatchObject({ label: 'tinker', value: 'tinker' });
    expect(json.options[0].emoji).toBeUndefined();
  });
});

describe('fetchPlayableClasses', () => {
  const params = { serverApiUrl: 'http://api', token: 'secret', eventId: 7 };

  it('asks the server for the classes of the event, with the internal token', async () => {
    const http = {
      get: vi.fn().mockResolvedValue({ data: { game: 'forever', classes: FOREVER } }),
    };

    await expect(fetchPlayableClasses(http, params)).resolves.toEqual(FOREVER);
    expect(http.get).toHaveBeenCalledWith('http://api/1/events/7/playable-classes', {
      headers: { 'x-internal-token': 'secret' },
    });
  });

  it('falls back to the Retail classes when the server fails', async () => {
    vi.spyOn(console, 'error').mockImplementation(() => {});
    const http = { get: vi.fn().mockRejectedValue(new Error('ECONNREFUSED')) };

    await expect(fetchPlayableClasses(http, params)).resolves.toEqual(DEFAULT_CLASSES);
    expect(DEFAULT_CLASSES).toHaveLength(13);
  });

  it('falls back to the Retail classes on an empty answer', async () => {
    vi.spyOn(console, 'warn').mockImplementation(() => {});
    const http = { get: vi.fn().mockResolvedValue({ data: { classes: [] } }) };

    await expect(fetchPlayableClasses(http, params)).resolves.toEqual(DEFAULT_CLASSES);
  });
});

describe('formatEntry (roster message)', () => {
  it('uses the Unicode fallback emoji of a known class', () => {
    expect(formatEntry({ name: 'Thrall', class: 'Shaman' }, new Map())).toBe('⚡ Thrall');
  });

  it('shows the name alone for a class absent from the table', () => {
    vi.spyOn(console, 'warn').mockImplementation(() => {});
    expect(formatEntry({ name: 'Gizmo', class: 'tinker' }, new Map())).toBe('Gizmo');
    expect(formatEntry({ name: 'Gizmo', class: 'constructor' }, new Map())).toBe('Gizmo');
  });

  it('prefers the Discord emoji of the class', () => {
    const emojiMap = new Map([['death_knight', '<:dk:1>']]);
    expect(formatEntry({ name: 'Arthas', class: 'Death Knight' }, emojiMap)).toBe('<:dk:1> Arthas');
  });
});
