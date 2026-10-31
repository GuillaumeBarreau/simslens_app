import { SegmentedControl } from '@mantine/core';
import { Difficulty } from 'contexts/DifficultyContext';
import React from 'react';
import { useTranslation } from 'react-i18next';

interface DifficultySelectorProps {
  difficulty: Difficulty;
  setDifficulty: (difficulty: Difficulty) => void;
}

const DifficultySelector: React.FC<DifficultySelectorProps> = ({ difficulty, setDifficulty }) => {
  const { t } = useTranslation('common');

  return (
    <SegmentedControl
      value={difficulty}
      onChange={(value) => setDifficulty(value as Difficulty)}
      color="brand.5"
      data={[
        { label: t('difficulties.mythic'), value: 'mythic' },
        { label: t('difficulties.heroic'), value: 'heroic' },
        { label: t('difficulties.normal'), value: 'normal' },
      ]}
    />
  );
};

export default DifficultySelector;
