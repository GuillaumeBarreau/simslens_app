import { SegmentedControl } from '@mantine/core';
import { Difficulty } from 'contexts/DifficultyContext';
import { useGame } from 'hooks/useGame';
import React from 'react';
import { useTranslation } from 'react-i18next';

const DISPLAY_ORDER: Difficulty[] = ['mythic', 'heroic', 'normal'];

interface DifficultySelectorProps {
  difficulty: Difficulty;
  setDifficulty: (difficulty: Difficulty) => void;
}

const DifficultySelector: React.FC<DifficultySelectorProps> = ({ difficulty, setDifficulty }) => {
  const { t } = useTranslation('common');
  const { difficulties } = useGame().definition;

  // Un jeu à difficulté unique (Forever) n'a rien à choisir.
  if (difficulties.length < 2) return null;

  return (
    <SegmentedControl
      value={difficulty}
      onChange={(value) => setDifficulty(value as Difficulty)}
      color="brand.5"
      data={DISPLAY_ORDER.filter((value) => difficulties.includes(value)).map((value) => ({
        label: t(`difficulties.${value}`),
        value,
      }))}
    />
  );
};

export default DifficultySelector;
