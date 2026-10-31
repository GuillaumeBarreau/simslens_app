import { MantineProvider, TextInput } from '@mantine/core';
import { fireEvent, render, screen } from '@testing-library/react';
import type { ReactNode } from 'react';

import { SettingsGroup, SettingsRow, SettingsSwitchRow } from '.';

const renderUi = (ui: ReactNode) => render(<MantineProvider>{ui}</MantineProvider>);

describe('<SettingsGroup />', () => {
  it('exposes its title as the name of the section', () => {
    renderUi(
      <SettingsGroup title="M+ (Info)" description="Infos de donjon">
        <SettingsRow title="Meilleure clé" />
      </SettingsGroup>,
    );
    expect(screen.getByRole('region', { name: 'M+ (Info)' })).toBeTruthy();
    expect(screen.getByText('Infos de donjon')).toBeTruthy();
    expect(screen.getByText('Meilleure clé')).toBeTruthy();
  });
});

describe('<SettingsRow />', () => {
  it('uses its title as the label of the control on the right', () => {
    renderUi(
      <SettingsRow
        title="Durée du combat"
        description="En secondes"
        labelFor="fight-length"
        controlWidth={200}
        control={<TextInput id="fight-length" defaultValue="300" />}
      />,
    );
    expect(screen.getByLabelText('Durée du combat')).toBeTruthy();
    expect(screen.getByText('En secondes')).toBeTruthy();
  });

  it('dims and flags a disabled row', () => {
    renderUi(<SettingsRow title="Verrouillé" disabled />);
    const row = screen.getByText('Verrouillé').closest('[aria-disabled]');
    expect(row?.getAttribute('aria-disabled')).toBe('true');
    expect(row?.getAttribute('data-dimmed')).toBe('true');
  });

  it('is not dimmed by default', () => {
    renderUi(<SettingsRow title="Actif" />);
    expect(screen.getByText('Actif').closest('[data-dimmed]')).toBeNull();
  });
});

describe('<SettingsSwitchRow />', () => {
  it('dims an option that is off, not one that is on', () => {
    renderUi(
      <>
        <SettingsSwitchRow title="Allumée" checked onChange={() => {}} />
        <SettingsSwitchRow title="Éteinte" checked={false} onChange={() => {}} />
      </>,
    );
    expect(screen.getByText('Allumée').closest('[data-dimmed]')).toBeNull();
    expect(screen.getByText('Éteinte').closest('[data-dimmed]')).not.toBeNull();
  });

  it('reports the new state when the switch or its title is clicked', () => {
    const onChange = vi.fn();
    renderUi(
      <SettingsSwitchRow
        title="Historique de saison"
        description="Enregistre l'historique"
        checked={false}
        onChange={onChange}
      />,
    );
    const toggle = screen.getByRole('switch', { name: 'Historique de saison' });
    fireEvent.click(toggle);
    expect(onChange).toHaveBeenLastCalledWith(true);

    fireEvent.click(screen.getByText('Historique de saison'));
    expect(onChange).toHaveBeenCalledTimes(2);
    expect(toggle.getAttribute('aria-describedby')).toBe(
      screen.getByText("Enregistre l'historique").id,
    );
  });

  it('keeps a disabled switch untouchable and dimmed even when on', () => {
    renderUi(<SettingsSwitchRow title="Verrou" checked disabled onChange={() => {}} />);
    const toggle = screen.getByRole('switch', { name: 'Verrou' }) as HTMLInputElement;
    expect(toggle.disabled).toBe(true);
    expect(toggle.checked).toBe(true);
    expect(screen.getByText('Verrou').closest('[data-dimmed]')).not.toBeNull();
  });

  it('shows the state without letting it change when read-only', () => {
    renderUi(<SettingsSwitchRow title="Lecture seule" checked />);
    const toggle = screen.getByRole('switch', { name: 'Lecture seule' }) as HTMLInputElement;
    expect(toggle.readOnly).toBe(true);
    fireEvent.click(toggle);
    expect(toggle.checked).toBe(true);
  });

  it('lets the caller force the dimmed state', () => {
    renderUi(<SettingsSwitchRow title="Toujours net" checked={false} dimmed={false} />);
    expect(screen.getByText('Toujours net').closest('[data-dimmed]')).toBeNull();
  });
});
