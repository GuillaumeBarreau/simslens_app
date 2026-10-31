import { MantineProvider } from '@mantine/core';
import { fireEvent, render, screen, waitFor } from '@testing-library/react';
import type { CharacterSpecializations } from 'types/character.types';

import { SpecializationsForm } from './ActivitySpecializationsSection';

const mutateAsync = vi.hoisted(() => vi.fn());

vi.mock('hooks/queries', () => ({
  useCharacterSpecializations: vi.fn(),
  useUpdateCharacterSpecializations: () => ({ mutateAsync, isPending: false }),
}));
vi.mock('@mantine/notifications', () => ({ notifications: { show: vi.fn() } }));
vi.mock('react-i18next', () => ({
  useTranslation: () => ({
    t: (key: string, options?: { defaultValue?: string }) => options?.defaultValue ?? key,
  }),
}));

const SPECS: CharacterSpecializations = {
  characterId: 5,
  className: 'paladin',
  primarySpecializationId: 70,
  offSpecializationIds: [65],
  specializations: [
    {
      id: 65,
      name: 'Holy',
      role: 'healer',
      icon: null,
      isPrimary: false,
      isOffSpec: true,
      hasSimData: false,
    },
    {
      id: 66,
      name: 'Protection',
      role: 'tank',
      icon: null,
      isPrimary: false,
      isOffSpec: false,
      hasSimData: true,
    },
    {
      id: 70,
      name: 'Retribution',
      role: 'melee',
      icon: null,
      isPrimary: true,
      isOffSpec: false,
      hasSimData: true,
    },
  ],
};

const renderForm = (specializations = SPECS) =>
  render(
    <MantineProvider>
      <SpecializationsForm specializations={specializations} />
    </MantineProvider>,
  );

beforeEach(() => {
  mutateAsync.mockReset().mockResolvedValue(SPECS);
});

describe('SpecializationsForm', () => {
  it('offers as off-specs every spec of the class but the main one', () => {
    renderForm();
    expect(screen.getByRole('checkbox', { name: 'Holy' })).toBeTruthy();
    expect(screen.getByRole('checkbox', { name: 'Protection' })).toBeTruthy();
    expect(screen.queryByRole('checkbox', { name: 'Retribution' })).toBeNull();
    expect((screen.getByRole('checkbox', { name: 'Holy' }) as HTMLInputElement).checked).toBe(true);
  });

  it('shows the specs that have sim data', () => {
    renderForm();
    expect(screen.getByText('specializations.sim_data_label')).toBeTruthy();
    expect(screen.getAllByText('Protection').length).toBeGreaterThan(1);
    expect(screen.queryByText('specializations.sim_data_empty')).toBeNull();
  });

  it('says so when no sim has been imported', () => {
    renderForm({
      ...SPECS,
      specializations: SPECS.specializations.map((s) => ({ ...s, hasSimData: false })),
    });
    expect(screen.getByText('specializations.sim_data_empty')).toBeTruthy();
  });

  it('saves the full off-spec list, without resending an unchanged main spec', async () => {
    renderForm();
    fireEvent.click(screen.getByRole('checkbox', { name: 'Protection' }));
    fireEvent.click(screen.getByRole('button', { name: 'specializations.save' }));
    await waitFor(() =>
      expect(mutateAsync).toHaveBeenCalledWith({
        characterId: 5,
        payload: { offSpecializationIds: [65, 66] },
      }),
    );
  });

  it('keeps the save button disabled until something changes', () => {
    renderForm();
    expect(
      (screen.getByRole('button', { name: 'specializations.save' }) as HTMLButtonElement).disabled,
    ).toBe(true);
  });
});
