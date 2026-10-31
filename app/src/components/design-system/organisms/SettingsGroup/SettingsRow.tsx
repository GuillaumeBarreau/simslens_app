import type { CSSProperties, ReactNode } from 'react';

import classes from './SettingsGroup.module.css';

export interface SettingsRowProps {
  /** Icône au trait (Tabler, ~20 px) affichée à gauche. */
  icon?: ReactNode;
  title: ReactNode;
  description?: ReactNode;
  /** `id` posé sur la description, pour un `aria-describedby` du contrôle. */
  descriptionId?: string;
  control?: ReactNode;
  /**
   * Largeur du contrôle quand c'est un champ (ex. `260`). Sur mobile, le contrôle
   * passe alors sous le texte, en pleine largeur. Laisser vide pour un `Switch`.
   */
  controlWidth?: number | string;
  /** `id` du contrôle : le titre devient son `<label>`. */
  labelFor?: string;
  /** Atténue l'icône et le titre (option éteinte). */
  dimmed?: boolean;
  /** Réglage non modifiable : atténué, et signalé aux technologies d'assistance. */
  disabled?: boolean;
}

/**
 * Une ligne de réglage (SIMS-247) : icône, titre, description et contrôle à droite.
 * À placer dans un `SettingsGroup`, qui trace les filets entre les lignes.
 */
export function SettingsRow({
  icon,
  title,
  description,
  descriptionId,
  control,
  controlWidth,
  labelFor,
  dimmed = false,
  disabled = false,
}: SettingsRowProps) {
  const wide = controlWidth !== undefined;
  const controlStyle = wide
    ? ({
        '--settings-row-control-width':
          typeof controlWidth === 'number' ? `${controlWidth}px` : controlWidth,
      } as CSSProperties)
    : undefined;

  return (
    <div
      className={classes.row}
      data-dimmed={dimmed || disabled || undefined}
      data-disabled={disabled || undefined}
      aria-disabled={disabled || undefined}
    >
      {icon && (
        <div className={classes.icon} aria-hidden>
          {icon}
        </div>
      )}
      <div className={classes.body}>
        {labelFor ? (
          <label className={classes.rowTitle} htmlFor={labelFor}>
            {title}
          </label>
        ) : (
          <div className={classes.rowTitle}>{title}</div>
        )}
        {description && (
          <div id={descriptionId} className={classes.rowDescription}>
            {description}
          </div>
        )}
      </div>
      {control && (
        <div className={classes.control} data-wide={wide || undefined} style={controlStyle}>
          {control}
        </div>
      )}
    </div>
  );
}
