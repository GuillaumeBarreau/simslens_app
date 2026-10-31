import { Box, Flex, Image, Tooltip, UnstyledButton } from '@mantine/core';
import { useRouteParams } from 'hooks/useRouteParams';
import React from 'react';
import { Navigate, useNavigate, useParams } from 'react-router-dom';
import type { Boss } from 'types/raid';
import { resolveIconPath } from 'utils/resolveIconPath';

interface NavbarBossProps {
  bosses: Boss[];
  onSelect: (index: number) => void;
  activeIndex?: number;
  authElement?: React.ReactNode;
  disableNavigation?: boolean;
  showAllOption?: boolean;
  allLabel?: string;
}

function NavbarItem({
  label,
  icon,
  active,
  onClick,
}: {
  label: string;
  icon?: string;
  active?: boolean;
  onClick?: () => void;
}) {
  const { extension, season } = useRouteParams();

  return (
    <Tooltip label={label} position="bottom" transitionProps={{ duration: 0 }}>
      <UnstyledButton
        onClick={onClick}
        data-active={active || undefined}
        style={{
          padding: '8px',
          borderRadius: '8px',
          borderBottom: active ? '3px solid var(--mantine-color-brand-5)' : '3px solid transparent',
          transition: 'all 0.2s ease',
          opacity: active ? 1 : 0.6,
          backgroundColor: active ? 'rgba(255,255,255,0.05)' : 'transparent',
        }}
        onMouseEnter={(e) => (e.currentTarget.style.opacity = '1')}
        onMouseLeave={(e) => !active && (e.currentTarget.style.opacity = '0.6')}
      >
        <Flex direction="column" align="center" gap="xs">
          <Image
            src={resolveIconPath(icon, extension, season)}
            alt={label}
            w={68}
            h={68}
            radius="md"
            style={{}}
          />
        </Flex>
      </UnstyledButton>
    </Tooltip>
  );
}

export default function NavbarBoss({
  bosses,
  onSelect,
  activeIndex = 0,
  authElement,
  disableNavigation = false,
  showAllOption = false,
  allLabel = 'Tous',
}: NavbarBossProps) {
  const navigate = useNavigate();
  const params = useParams();
  const { extension, guild, season } = useRouteParams();
  const active = React.useMemo(() => {
    if (params.index === 'all') return -1;
    const idx = params.index ? parseInt(params.index, 10) : activeIndex;
    return isNaN(idx) ? activeIndex : idx;
  }, [params.index, activeIndex]);

  if (
    !disableNavigation &&
    bosses &&
    bosses.length > 0 &&
    active !== -1 &&
    (active < 0 || active >= bosses.length)
  ) {
    return <Navigate to={`/${guild}/${extension}/${season}/boss/0`} replace />;
  }

  const handleBossClick = (index: number) => {
    if (!disableNavigation) {
      try {
        const param = index === -1 ? 'all' : String(index);
        navigate(`/${guild}/${extension}/${season}/boss/${param}`);
      } catch (e) {
        /* navigate not available, fall back to callback */
      }
    }
    onSelect && onSelect(index);
  };
  return (
    <>
      <Flex justify="center" align="center" gap="md" px="xl" style={{ minWidth: 'max-content' }}>
        {showAllOption && (
          <Tooltip label={allLabel} position="bottom" transitionProps={{ duration: 0 }}>
            <UnstyledButton
              onClick={() => handleBossClick(-1)}
              data-active={active === -1 || undefined}
              style={{
                padding: '8px 12px',
                borderRadius: '8px',
                borderBottom:
                  active === -1
                    ? '3px solid var(--mantine-color-brand-5)'
                    : '3px solid transparent',
                transition: 'all 0.2s ease',
                opacity: active === -1 ? 1 : 0.6,
                backgroundColor: active === -1 ? 'rgba(255,255,255,0.05)' : 'transparent',
                height: 84,
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                fontSize: 13,
                fontWeight: 600,
                color: 'var(--mantine-color-text)',
                letterSpacing: '0.03em',
              }}
              onMouseEnter={(e) => (e.currentTarget.style.opacity = '1')}
              onMouseLeave={(e) => { if (active !== -1) e.currentTarget.style.opacity = '0.6'; }}
            >
              {allLabel}
            </UnstyledButton>
          </Tooltip>
        )}
        {bosses.map((b, i) => (
          <NavbarItem
            key={b.name}
            label={b.name}
            icon={b.icon ?? undefined}
            active={i === active}
            onClick={() => handleBossClick(i)}
          />
        ))}
      </Flex>
      {authElement && (
        <Box mt="xs" style={{ textAlign: 'center' }}>
          {authElement}
        </Box>
      )}
    </>
  );
}
