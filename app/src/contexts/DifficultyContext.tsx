import React, { createContext, ReactNode, useContext, useState } from 'react';

export type Difficulty = 'normal' | 'heroic' | 'mythic';

interface DifficultyContextType {
  difficulty: Difficulty;
  setDifficulty: (difficulty: Difficulty) => void;
}

const DifficultyContext = createContext<DifficultyContextType | undefined>(undefined);

export const useDifficulty = () => {
  const context = useContext(DifficultyContext);
  if (context === undefined) {
    throw new Error('useDifficulty must be used within a DifficultyProvider');
  }
  return context;
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
