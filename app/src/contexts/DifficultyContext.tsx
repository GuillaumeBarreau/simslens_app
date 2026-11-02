import { type GameDifficulty, resolveDifficulty } from 'config/games';
import { useGame } from 'hooks/useGame';
import React, { createContext, ReactNode, useContext, useMemo, useState } from 'react';

export type Difficulty = GameDifficulty;

interface DifficultyContextType {
  difficulty: Difficulty;
  setDifficulty: (difficulty: Difficulty) => void;
}

const DifficultyContext = createContext<DifficultyContextType | undefined>(undefined);

/**
 * Difficulté choisie, ramenée aux difficultés du jeu courant : Forever n'en a qu'une
 * (« normal »), qui s'impose quel que soit le choix mémorisé pour Retail.
 */
export const useDifficulty = () => {
  const context = useContext(DifficultyContext);
  const { difficulties } = useGame().definition;
  const value = useMemo(
    () =>
      context && {
        difficulty: resolveDifficulty(context.difficulty, difficulties),
        setDifficulty: context.setDifficulty,
        /** Difficultés du jeu courant, dans l'ordre du registre. */
        difficulties,
        /** Faux quand le jeu n'a qu'une difficulté : le sélecteur est alors masqué. */
        canSelectDifficulty: difficulties.length > 1,
      },
    [context, difficulties],
  );
  if (value === undefined) {
    throw new Error('useDifficulty must be used within a DifficultyProvider');
  }
  return value;
};

interface DifficultyProviderProps {
  children: ReactNode;
}

export const DifficultyProvider: React.FC<DifficultyProviderProps> = ({ children }) => {
  const [difficulty, setDifficulty] = useState<Difficulty>('mythic');

  return (
    <DifficultyContext.Provider value={{ difficulty, setDifficulty }}>
      {children}
    </DifficultyContext.Provider>
  );
};
