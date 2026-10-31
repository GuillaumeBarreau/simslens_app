import { type ReactNode, useId } from 'react';

import classes from './SettingsGroup.module.css';

export interface SettingsGroupProps {
  title?: ReactNode;
  icon?: ReactNode;
  description?: ReactNode;
  /** Les lignes : `SettingsRow` ou `SettingsSwitchRow`. */
  children: ReactNode;
}

/**
 * Section de réglages (SIMS-247) : un titre, puis un seul conteneur arrondi à
 * bordure fine où chaque `SettingsRow` est séparée de la suivante par un filet.
 */
export function SettingsGroup({ title, icon, description, children }: SettingsGroupProps) {
  const titleId = useId();

  return (
    <section className={classes.group} aria-labelledby={title ? titleId : undefined}>
      {(title || description) && (
        <div>
          {title && (
            <div className={classes.header}>
              {icon && (
                <span aria-hidden style={{ display: 'flex' }}>
                  {icon}
                </span>
              )}
              <h3 id={titleId} className={classes.groupTitle} style={{ margin: 0 }}>
                {title}
              </h3>
            </div>
          )}
          {description && <div className={classes.groupDescription}>{description}</div>}
        </div>
      )}
      <div className={classes.box}>{children}</div>
    </section>
  );
}
