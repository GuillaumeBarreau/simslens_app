import React, { createContext, useContext, useState } from 'react';

interface ValidatedLootsContextValue {
  validatedIds: number[];
  setValidatedIds: (ids: number[]) => void;
  filterEnabled: boolean;
  setFilterEnabled: (v: boolean) => void;
}

const ValidatedLootsContext = createContext<ValidatedLootsContextValue | null>(null);

export const ValidatedLootsProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const [validatedIds, setValidatedIds] = useState<number[]>([]);
  const [filterEnabled, setFilterEnabled] = useState<boolean>(false);

  return (
    <ValidatedLootsContext.Provider
      value={{ validatedIds, setValidatedIds, filterEnabled, setFilterEnabled }}
    >
      {children}
    </ValidatedLootsContext.Provider>
  );
};

export function useValidatedLoots() {
  const ctx = useContext(ValidatedLootsContext);
  if (!ctx) throw new Error('useValidatedLoots must be used within ValidatedLootsProvider');
  return ctx;
}

