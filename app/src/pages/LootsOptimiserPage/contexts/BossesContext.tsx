import { useBosses } from 'hooks/queries';
import { useRouteParams } from 'hooks/useRouteParams';
import React, { createContext, ReactNode, useContext } from 'react';
import type { Boss } from 'types/raid';

interface BossesContextType {
  bosses: Boss[];
}

const BossesContext = createContext<BossesContextType | undefined>(undefined);

export const useBossesContext = () => {
  const context = useContext(BossesContext);
  if (context === undefined) {
    throw new Error('useBossesContext must be used within a BossesProvider');
  }
  return context.bosses;
};

interface BossesProviderProps {
  children: ReactNode;
  bosses?: Boss[];
}

export const BossesProvider: React.FC<BossesProviderProps> = ({ children, bosses: bossesProp }) => {
  const { extension, season } = useRouteParams();
  const { data: bossesData = [] } = useBosses(extension, season);

  if (Array.isArray(bossesProp)) {
    return (
      <BossesContext.Provider value={{ bosses: bossesProp }}>{children}</BossesContext.Provider>
    );
  }

  const bosses = bossesData as unknown as Boss[];

  return <BossesContext.Provider value={{ bosses }}>{children}</BossesContext.Provider>;
};
