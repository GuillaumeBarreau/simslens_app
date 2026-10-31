import {
  getClassWeaponConfig,
  SPEC_SLOT_QUERY_OVERRIDES,
  SPEC_SLOT_QUERY_RESET,
} from '../pages/WishlistPage/constants';

export function getQuerySlot(
  selectedSlot: string | null,
  characterClass: string | undefined,
  specName: string | undefined,
): string | undefined {
  if (!selectedSlot) return undefined;

  if (specName) {
    if (SPEC_SLOT_QUERY_OVERRIDES[specName]?.[selectedSlot]) {
      return SPEC_SLOT_QUERY_OVERRIDES[specName][selectedSlot];
    }
    if (SPEC_SLOT_QUERY_RESET.has(specName)) {
      return undefined;
    }
  }

  const config = getClassWeaponConfig(characterClass);
  if (config?.slotQueryOverrides?.[selectedSlot]) {
    return config.slotQueryOverrides[selectedSlot];
  }

  return undefined;
}
