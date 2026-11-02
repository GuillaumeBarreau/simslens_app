import { MantineProvider } from '@mantine/core';
import { notifications } from '@mantine/notifications';
import { fireEvent, render, screen, waitFor } from '@testing-library/react';
import type { ClassSpecializations } from 'types/character.types';

import {
  addOwnCharacterErrorKey,
  buildAddOwnCharacterPayload,
  gameSpecializationKey,
  isValidOwnCharacterName,
  needsOwnCharacter,
} from './addOwnCharacter.utils';
import { AddOwnCharacterForm } from './AddOwnCharacterModal';

const mutateAsync = vi.hoisted(() => vi.fn());

vi.mock('hooks/queries', () => ({
  useAddOwnCharacter: () => ({ mutateAsync, isPending: false }),
  useClassSpecializations: vi.fn(),
}));
vi.mock('@mantine/notifications', () => ({ notifications: { show: vi.fn() } }));
vi.mock('react-i18next', () => ({
  useTranslation: () => ({
    t: (key: string, options?: { defaultValue?: string }) => options?.defaultValue ?? key,
  }),
}));

/** Classes WoW Forever servies par `?game=forever` : libellés propres au jeu. */
const FOREVER_CLASSES: ClassSpecializations[] = [
  {
    id: 4,
    name: 'rogue',
    specializations: [
      { id: 259, name: 'Assassination', classId: 4, role: 'melee', label: 'Assassination' },
      { id: 260, name: 'Outlaw', classId: 4, role: 'melee', label: 'Combat' },
      { id: 261, name: 'Subtlety', classId: 4, role: 'melee', label: 'Subtlety' },
    ],
  },
  {
    id: 1,
    name: 'warrior',
    specializations: [{ id: 71, name: 'Arms', classId: 1, role: 'melee', label: 'Arms' }],
  },
];

const onAdded = vi.fn();

const renderForm = () =>
  render(
    <MantineProvider>
      <AddOwnCharacterForm realmId={7} classes={FOREVER_CLASSES} onAdded={onAdded} />
    </MantineProvider>,
  );

/** Le menu de Mantine reste « caché » pendant sa transition sous happy-dom. */
const pick = async (field: RegExp, option: string) => {
  fireEvent.click(screen.getByRole('textbox', { name: field }));
  fireEvent.click(await screen.findByRole('option', { name: option, hidden: true }));
};

const typeName = (value: string) =>
  fireEvent.change(screen.getByRole('textbox', { name: /own_character.fields.name.label/ }), {
    target: { value },
  });

const submit = () => fireEvent.click(screen.getByRole('button', { name: 'own_character.submit' }));

beforeEach(() => {
  mutateAsync.mockReset().mockResolvedValue({ id: 42, name: 'Aerin Valcourt' });
  onAdded.mockReset();
  vi.mocked(notifications.show).mockReset();
});

describe('<AddOwnCharacterForm />', () => {
  it('offers the Forever classes and their specs with the game label', async () => {
    renderForm();
    await pick(/own_character.fields.class.label/, 'rogue');
    fireEvent.click(screen.getByRole('textbox', { name: /own_character.fields.spec.label/ }));
    expect(await screen.findByRole('option', { name: 'Combat', hidden: true })).toBeTruthy();
    expect(screen.queryByRole('option', { name: 'Outlaw', hidden: true })).toBeNull();
  });

  it('sends the character with its main spec and off-specs, then hands it over', async () => {
    renderForm();
    typeName('  Aerin   Valcourt ');
    await pick(/own_character.fields.class.label/, 'rogue');
    await pick(/own_character.fields.spec.label/, 'Combat');
    fireEvent.click(screen.getByRole('checkbox', { name: 'Subtlety' }));
    expect(screen.queryByRole('checkbox', { name: 'Combat' })).toBeNull();
    submit();

    await waitFor(() =>
      expect(mutateAsync).toHaveBeenCalledWith({
        realmId: 7,
        name: 'Aerin Valcourt',
        class: 'rogue',
        specializationId: 260,
        offSpecializationIds: [261],
      }),
    );
    await waitFor(() => expect(onAdded).toHaveBeenCalledWith({ id: 42, name: 'Aerin Valcourt' }));
  });

  it('refuses an invalid name without calling the API', async () => {
    renderForm();
    typeName('Aerin42');
    await pick(/own_character.fields.class.label/, 'warrior');
    submit();

    expect(await screen.findByText('own_character.fields.name.error')).toBeTruthy();
    expect(mutateAsync).not.toHaveBeenCalled();
  });

  it('requires a class', async () => {
    renderForm();
    typeName('Aerin Valcourt');
    submit();

    expect(await screen.findByText('own_character.fields.class.error')).toBeTruthy();
    expect(mutateAsync).not.toHaveBeenCalled();
  });

  it('explains a name already taken', async () => {
    mutateAsync.mockRejectedValue({ error: 'conflict', message: 'Aerin existe déjà' });
    renderForm();
    typeName('Aerin Valcourt');
    await pick(/own_character.fields.class.label/, 'warrior');
    submit();

    await waitFor(() =>
      expect(notifications.show).toHaveBeenCalledWith(
        expect.objectContaining({ message: 'own_character.errors.name_taken', color: 'red' }),
      ),
    );
    expect(onAdded).not.toHaveBeenCalled();
  });
});

describe('addOwnCharacter.utils', () => {
  it.each(['Thrall', 'Jean-Luc Picard', "Ana d'Arc", 'Ana d’Arc', 'Élodie Brûlé', ' Ana  Arc '])(
    'accepts the name %j',
    (name) => expect(isValidOwnCharacterName(name)).toBe(true),
  );

  it.each(['T', 'Thrall42', '-Thrall', 'Thrall-', 'Thrall_Son', 'a'.repeat(41)])(
    'refuses the name %j',
    (name) => expect(isValidOwnCharacterName(name)).toBe(false),
  );

  it('builds the payload without the main spec among off-specs', () => {
    expect(
      buildAddOwnCharacterPayload(7, {
        name: ' Ana  Arc ',
        class: 'rogue',
        specializationId: '260',
        offSpecializationIds: ['260', '261'],
      }),
    ).toEqual({
      realmId: 7,
      name: 'Ana Arc',
      class: 'rogue',
      specializationId: 260,
      offSpecializationIds: [261],
    });
    expect(
      buildAddOwnCharacterPayload(7, {
        name: 'Ana',
        class: 'rogue',
        specializationId: null,
        offSpecializationIds: [],
      }),
    ).toEqual({ realmId: 7, name: 'Ana', class: 'rogue' });
  });

  it('turns a game label into a translation key', () => {
    expect(gameSpecializationKey('Feral Combat (cat)')).toBe('feral_combat_cat');
    expect(gameSpecializationKey('Beast Mastery')).toBe('beast_mastery');
  });

  it('offers to add a character only in a Forever guild where the player has none', () => {
    const roster = [{ userId: '9' }, { userId: null }];
    expect(needsOwnCharacter('forever', roster, 42)).toBe(true);
    expect(needsOwnCharacter('forever', [...roster, { userId: '42' }], 42)).toBe(false);
    expect(needsOwnCharacter('retail', roster, 42)).toBe(false);
    expect(needsOwnCharacter(undefined, roster, 42)).toBe(false);
    expect(needsOwnCharacter('forever', roster, undefined)).toBe(false);
  });

  it('translates the known API errors only', () => {
    expect(addOwnCharacterErrorKey({ error: 'conflict' })).toBe('own_character.errors.name_taken');
    expect(addOwnCharacterErrorKey({ error: 'game_capability_unavailable' })).toBe(
      'own_character.errors.not_forever',
    );
    expect(addOwnCharacterErrorKey({ error: 'server_error' })).toBeNull();
    expect(addOwnCharacterErrorKey(null)).toBeNull();
  });
});
