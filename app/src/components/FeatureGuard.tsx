import { Center, Image, Stack, Text } from '@mantine/core';
import type { FeatureName } from 'config/featureFlags';
import { isFeatureInDevelopment } from 'config/featureFlags';
import type { ReactNode } from 'react';
import { useTranslation } from 'react-i18next';

interface FeatureGuardProps {
  feature: FeatureName;
  children: ReactNode;
}

/**
 * Masque une page tant que la fonctionnalité est en cours de développement.
 *
 * Remplace l'ancien TierGuard, qui verrouillait selon l'abonnement de la guilde.
 * Il n'y a plus de restriction par palier : toute fonctionnalité livrée est
 * accessible à tout le monde.
 */
export function FeatureGuard({ feature, children }: FeatureGuardProps) {
  const { t } = useTranslation('common');

  if (isFeatureInDevelopment(feature)) {
    return (
      <Center h="calc(100vh - 53px)" w="100%">
        <Stack align="center" gap="md" c="dimmed">
          <Image src="/src/locked-character.png" alt="" w={500} h="auto" mb="md" />
          <Text fw={600}>{t('feature_unavailable.title')}</Text>
          <Text fz="sm" c="dimmed" ta="center">
            {t('feature_unavailable.description')}
          </Text>
        </Stack>
      </Center>
    );
  }

  return <>{children}</>;
}
