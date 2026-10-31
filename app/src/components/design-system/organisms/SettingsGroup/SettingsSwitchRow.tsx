import { Switch } from '@mantine/core';
import { useId } from 'react';

import { SettingsRow, type SettingsRowProps } from './SettingsRow';

export interface SettingsSwitchRowProps extends Omit<
  SettingsRowProps,
  'control' | 'controlWidth' | 'labelFor' | 'descriptionId'
> {
  checked: boolean;
  /** Reçoit le nouvel état. Sans ce rappel, la ligne est en lecture seule. */
  onChange?: (checked: boolean) => void;
}

/**
 * `SettingsRow` avec un `Switch` à droite (SIMS-247). Le titre est le libellé de
 * l'interrupteur ; une option éteinte ou désactivée est atténuée. Sans `onChange`,
 * l'interrupteur montre l'état sans permettre de le changer (lecture seule).
 */
export function SettingsSwitchRow({
  checked,
  onChange,
  disabled = false,
  dimmed,
  description,
  ...rowProps
}: SettingsSwitchRowProps) {
  const switchId = useId();
  const descriptionId = useId();
  const readOnly = !onChange;

  return (
    <SettingsRow
      {...rowProps}
      description={description}
      descriptionId={descriptionId}
      labelFor={switchId}
      disabled={disabled}
      dimmed={dimmed ?? !checked}
      control={
        <Switch
          id={switchId}
          checked={checked}
          onChange={(event) => onChange?.(event.currentTarget.checked)}
          disabled={disabled}
          readOnly={readOnly}
          aria-readonly={readOnly || undefined}
          aria-describedby={description ? descriptionId : undefined}
          color="brand.5"
          size="md"
          styles={readOnly ? { track: { cursor: 'default' } } : undefined}
        />
      }
    />
  );
}
