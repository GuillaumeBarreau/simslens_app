import type { BisItem, BisSlot } from 'services/bis.service';

/** Au plus 5 objets par emplacement, comme côté API (SIMS-030). */
export const MAX_BIS_ITEMS_PER_SLOT = 5;

export type BisSlotGroupId = 'armor' | 'accessories' | 'weapons';

/** Emplacements de l'API, rangés comme sur un paperdoll. */
export const BIS_SLOT_GROUPS: { id: BisSlotGroupId; slots: string[] }[] = [
  {
    id: 'armor',
    slots: ['head', 'shoulders', 'back', 'chest', 'wrists', 'hands', 'waist', 'legs', 'feet'],
  },
  { id: 'accessories', slots: ['neck', 'finger1', 'finger2', 'trinket1', 'trinket2'] },
  { id: 'weapons', slots: ['main_hand', 'off_hand', 'two_hand', 'ranged'] },
];

/**
 * Range les emplacements reçus par groupe, dans l'ordre du paperdoll. Un emplacement
 * absent de la réponse est rendu vide, un emplacement inconnu est ignoré.
 */
export function groupBisSlots(
  slots: readonly BisSlot[] | undefined,
): { id: BisSlotGroupId; slots: BisSlot[] }[] {
  const bySlot = new Map((slots ?? []).map((s) => [s.slot, s]));
  return BIS_SLOT_GROUPS.map((group) => ({
    id: group.id,
    slots: group.slots.map(
      (slot) => bySlot.get(slot) ?? { slot, source: null, season: null, items: [] },
    ),
  }));
}

export function hasAnyBisItem(slots: readonly BisSlot[] | undefined): boolean {
  return (slots ?? []).some((s) => s.items.length > 0);
}

export type BisOrigin = 'guild' | 'curated' | 'previousTier';

/**
 * Badges d'origine d'un emplacement : guilde ou référence, plus « palier antérieur »
 * quand la liste retenue vient d'un autre palier que celui affiché.
 */
export function getBisOrigins(slot: BisSlot, currentSeason: string): BisOrigin[] {
  if (!slot.source || slot.items.length === 0) return [];
  const origins: BisOrigin[] = [slot.source];
  if (slot.season && slot.season !== currentSeason) origins.push('previousTier');
  return origins;
}

/**
 * ID d'objet saisi par un officier : un nombre (« 19019 ») ou une URL Wowhead collée
 * (« https://www.wowhead.com/forever/item=19019/thunderfury »). null si illisible.
 */
export function parseWowheadItemId(input: string): number | null {
  const value = input.trim();
  if (!value) return null;
  const match = /^\d+$/.test(value) ? [value, value] : value.match(/(?:^|[?&/#])item=(\d+)/i);
  if (!match) return null;
  const id = Number(match[1]);
  return Number.isSafeInteger(id) && id > 0 ? id : null;
}

/** Déplace l'objet d'un rang vers le haut (-1) ou le bas (+1) ; hors bornes : inchangé. */
export function moveBisItem<T>(items: readonly T[], index: number, direction: -1 | 1): T[] {
  const target = index + direction;
  if (index < 0 || index >= items.length || target < 0 || target >= items.length) {
    return [...items];
  }
  const next = [...items];
  [next[index], next[target]] = [next[target], next[index]];
  return next;
}

export type AddBisItemError = 'invalid' | 'duplicate' | 'full';

/** Ajoute un objet en dernier rang, ou dit pourquoi c'est impossible. */
export function addBisItem(
  items: readonly BisItem[],
  input: string,
  note: string,
): { items: BisItem[]; error?: undefined } | { items?: undefined; error: AddBisItemError } {
  const itemId = parseWowheadItemId(input);
  if (itemId === null) return { error: 'invalid' };
  if (items.some((item) => item.itemId === itemId)) return { error: 'duplicate' };
  if (items.length >= MAX_BIS_ITEMS_PER_SLOT) return { error: 'full' };
  const trimmed = note.trim();
  return { items: [...items, { itemId, note: trimmed ? trimmed : null }] };
}

/**
 * Spé affichée : celle de l'URL si elle existe dans Forever, sinon celle du personnage
 * sélectionné si elle est jouable dans Forever, sinon aucune (l'utilisateur choisit).
 */
export function resolveBisSpecId(
  urlSpecId: string | null,
  characterSpecId: number | null | undefined,
  availableSpecIds: readonly number[],
): number | null {
  const fromUrl = urlSpecId ? Number(urlSpecId) : NaN;
  if (availableSpecIds.includes(fromUrl)) return fromUrl;
  if (characterSpecId && availableSpecIds.includes(characterSpecId)) return characterSpecId;
  return null;
}

/** Corps du PUT : ordre = rang, note vide omise. */
export function toSaveItems(items: readonly BisItem[]): { itemId: number; note?: string }[] {
  return items.map(({ itemId, note }) => {
    const trimmed = note?.trim();
    return trimmed ? { itemId, note: trimmed } : { itemId };
  });
}
