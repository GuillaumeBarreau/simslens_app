import { ActionIcon, Flex, Tooltip } from '@mantine/core';
import { IconBug } from '@tabler/icons-react';
import { GITHUB_URL } from 'config/site';
import React from 'react';
import { useTranslation } from 'react-i18next';

interface ContactUsProps {
  children?: React.ReactNode;
}

export const ContactUs = ({ children }: ContactUsProps) => {
  const { t } = useTranslation('contact');
  const issuesUrl = `${GITHUB_URL}/issues`;

  if (children) {
    return (
      <a
        href={issuesUrl}
        target="_blank"
        rel="noopener noreferrer"
        style={{ cursor: 'pointer', textDecoration: 'none', color: 'inherit' }}
      >
        <Flex direction="row" align="center" gap="xs">
          <IconBug size={24} />
          {children}
        </Flex>
      </a>
    );
  }

  return (
    <Tooltip label={t('tooltip')}>
      <ActionIcon
        component="a"
        href={issuesUrl}
        target="_blank"
        rel="noopener noreferrer"
        variant="transparent"
        size="lg"
        color="brand.5"
        aria-label={t('tooltip')}
      >
        <IconBug size={24} />
      </ActionIcon>
    </Tooltip>
  );
};
