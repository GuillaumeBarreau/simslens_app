import type { TFunction } from 'i18next';
import type { Character } from 'types/character.types';
import { specializationKey } from 'utils/specializations';

import { isOtherRealm, roleOf } from '../rosterView';

export function characterSubtitle(
  character: Pick<Character, 'specialization' | 'realm'>,
  t: TFunction,
  guildRealm?: string,
): string {
  const spec = character.specialization?.name;
  const role = roleOf(character);
  const parts = [
    spec
      ? t(`common:specializations.${specializationKey(spec)}`, { defaultValue: spec })
      : t('roster:page.no_spec'),
    role !== 'unknown' ? t(`roster:page.roles.${role}`) : null,
    isOtherRealm(character.realm, guildRealm)
      ? character.realm.charAt(0).toUpperCase() + character.realm.slice(1)
      : null,
  ];
  return parts.filter(Boolean).join(' · ');
}

export function classColorClass(className: string | number): string {
  return `class-${className}`;
}
