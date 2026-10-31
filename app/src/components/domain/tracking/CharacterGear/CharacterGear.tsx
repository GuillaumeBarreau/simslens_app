import {
  ActionIcon,
  Badge,
  Box,
  Card,
  Grid,
  Group,
  Image,
  Skeleton,
  Stack,
  Text,
  Tooltip,
} from '@mantine/core';
import { IconCheck, IconNotebook, IconX } from '@tabler/icons-react';
import { useQuery } from '@tanstack/react-query';
import {
  type EnchantResult,
  SlotStatusIndicator,
} from 'components/domain/gear/SlotStatusIndicator';
import { API_VERSION } from 'config/apiConstants';
import { useEffect, useState } from 'react';
import { useTranslation } from 'react-i18next';
import api from 'services/api';
import type { Characters } from 'types/shared';
import { getQualityColor } from 'utils/qualityColors';
import { resolveBlizzardIcon, resolveFallbackIcon } from 'utils/resolveIconPath';

interface GearItem {
  slot: string;
  itemId: number;
  ilevel: number;
  encodedItem: string;
  upgradeLevel?: number | null;
  upgradeMax?: number | null;
  upgradeName?: string | null;
  upgradeFullName?: string | null;
  upgradeBonusId?: number | null;
  baseItemLevel?: number | null;
  itemSource?: string | null;
  craftingQuality?: number | null;
  upgradeItemLevel?: number | null;
  upgradeGroup?: number | null;
  item: {
    id: number;
    name: string;
    icon: string;
    quality: number;
  };
}

interface GearSlotItem {
  itemId: number;
  name: string;
  icon: string;
  quality: number;
  ilevel: number;
  itemSource?: string | null;
  upgradeFullName?: string | null;
  craftingQuality?: number | null;
}

interface GearSnapshot {
  id: number;
  characterId: number;
  reportId: string;
  spec: string;
  difficulty: string;
  timestamp: string;
  items: GearItem[];
}

interface CharacterGearProps {
  character: Characters;
  background?: string;
  difficulty?: string;
  /** Pre-fetched gear snapshot from the bulk endpoint. If provided, skips the individual API call. */
  gearData?: { snapshot: GearSnapshot | null } | null;
  /** When true, adds the same blurred background image as CharacterSheet for visual consistency. */
  showBackgroundImage?: boolean;
}

const LEFT_SLOTS = ['head', 'neck', 'shoulders', 'back', 'chest', 'wrists'];
const RIGHT_SLOTS = [
  'hands',
  'waist',
  'legs',
  'feet',
  'finger1',
  'finger2',
  'trinket1',
  'trinket2',
];
const BOTTOM_SLOTS = ['main_hand', 'off_hand'];

const SLOT_NAMES: Record<string, string> = {
  head: 'Head',
  neck: 'Neck',
  shoulders: 'Shoulders',
  back: 'Back',
  chest: 'Chest',
  wrists: 'Wrists',
  hands: 'Hands',
  waist: 'Waist',
  legs: 'Legs',
  feet: 'Feet',
  finger1: 'Finger 1',
  finger2: 'Finger 2',
  trinket1: 'Trinket 1',
  trinket2: 'Trinket 2',
  main_hand: 'Main Hand',
  off_hand: 'Off Hand',
};

const SLOT_ICONS: Record<string, string> = {
  head: 'inv_helmet_01',
  neck: 'inv_jewelry_necklace_01',
  shoulders: 'inv_shoulder_01',
  back: 'inv_misc_cape_01',
  chest: 'inv_chest_chain',
  wrists: 'inv_bracer_01',
  hands: 'inv_gauntlets_01',
  waist: 'inv_belt_01',
  legs: 'inv_pants_01',
  feet: 'inv_boots_01',
  finger1: 'inv_jewelry_ring_01',
  finger2: 'inv_jewelry_ring_01',
  trinket1: 'inv_jewelry_talisman_01',
  trinket2: 'inv_jewelry_talisman_01',
  main_hand: 'inv_sword_04',
  off_hand: 'inv_shield_04',
};

function VisualGearSlot({
  slotKey,
  slotLabel,
  slotIcon,
  item,
  isRight,
  enchantResult,
  gemResult,
}: {
  slotKey: string;
  slotLabel: string;
  slotIcon: string;
  item: GearSlotItem | null;
  isRight: boolean;
  enchantResult?: EnchantResult;
  gemResult?: EnchantResult;
}) {
  if (slotKey.startsWith('spacer')) {
    return <div style={{ width: 42, height: 42 }} />;
  }

  const hasItem = !!item?.itemId;
  const itemName = item?.name;

  const getUpgradeColor = (upgradeName: string | undefined | null) => {
    if (!upgradeName) return 'gray';
    const name = upgradeName.toLowerCase();
    if (name.includes('myth')) return 'orange';
    if (name.includes('hero')) return 'grape';
    if (name.includes('champ')) return 'blue';
    if (name.includes('vet')) return 'cyan';
    if (name.includes('expl')) return 'teal';
    if (name.includes('adv')) return 'green';
    return 'gray';
  };

  const getSourceColor = (source: string | undefined | null) => {
    if (!source) return 'gray';
    if (source === 'raid') return 'red';
    if (source === 'dungeon') return 'indigo';
    if (source === 'token') return 'yellow';
    if (source === 'craft') return 'cyan';
    return 'gray';
  };

  const renderDetails = () => {
    if (!hasItem) return null;

    return (
      <Stack gap="0" align={isRight ? 'flex-start' : 'flex-end'} style={{ minWidth: 0, flex: 1 }}>
        <Text
          c={getQualityColor(item.quality)}
          size="xs"
          fw={600}
          ta={isRight ? 'left' : 'right'}
          style={{
            textShadow: '1px 1px 2px rgba(0,0,0,0.8)',
            lineHeight: 1.1,
            whiteSpace: 'nowrap',
            overflow: 'hidden',
            textOverflow: 'ellipsis',
            width: '100%',
          }}
        >
          {itemName}
        </Text>

        <Group gap={4} justify={isRight ? 'flex-start' : 'flex-end'} wrap="nowrap" mt={2}>
          <Badge
            variant="filled"
            color="dark.6"
            size="xs"
            radius="sm"
            style={{ fontSize: '9px', height: '16px' }}
          >
            {item.ilevel}
          </Badge>

          {item.itemSource && (
            <Badge
              size="xs"
              variant="light"
              color={getSourceColor(item.itemSource)}
              radius="sm"
              style={{ fontSize: '9px', height: '16px' }}
            >
              {item.itemSource === 'raid'
                ? 'RAID'
                : item.itemSource === 'dungeon'
                  ? 'DUNG'
                  : item.itemSource.toUpperCase()}
            </Badge>
          )}

          {item.itemSource === 'craft' && item.craftingQuality ? (
            <Badge
              size="xs"
              variant="filled"
              color="gray"
              radius="sm"
              style={{
                color: item.craftingQuality === 5 ? '#ffcc00' : 'white',
                fontSize: '9px',
                height: '16px',
              }}
            >
              {'★'.repeat(item.craftingQuality)}
            </Badge>
          ) : item.upgradeFullName ? (
            <Badge
              size="xs"
              variant="filled"
              color={getUpgradeColor(item.upgradeFullName)}
              radius="sm"
              style={{ fontSize: '9px', height: '16px' }}
            >
              {item.upgradeFullName.split(' ')[0]}
            </Badge>
          ) : null}
        </Group>
      </Stack>
    );
  };

  return (
    <Group
      gap="8px"
      wrap="nowrap"
      align="center"
      style={{
        flexDirection: isRight ? 'row' : 'row',
        justifyContent: isRight ? 'flex-start' : 'flex-end',
        width: '100%',
      }}
    >
      {!isRight && renderDetails()}
      {isRight && <SlotStatusIndicator enchantResult={enchantResult} gemResult={gemResult} />}

      <Tooltip
        label={slotLabel}
        disabled={hasItem}
        position={isRight ? 'left' : 'right'}
        withArrow
        transitionProps={{ duration: 200 }}
      >
        <Box
          w="42"
          h="42"
          bg="dark-7"
          style={{
            position: 'relative',
            borderRadius: 4,
            border: '1px solid',
            borderColor: hasItem ? getQualityColor(item.quality) : 'var(--mantine-color-dark-4)',
            overflow: 'hidden',
            flexShrink: 0,
            boxShadow: '0 2px 4px rgba(0,0,0,0.3)',
          }}
        >
          <Image
            src={hasItem ? resolveBlizzardIcon(item.icon) : resolveBlizzardIcon(slotIcon)}
            fallbackSrc={hasItem ? resolveFallbackIcon(item.icon) : resolveFallbackIcon(slotIcon)}
            w="100%"
            h="100%"
            style={{
              filter: hasItem ? 'none' : 'grayscale(100%)',
              opacity: hasItem ? 1 : 0.6,
            }}
          />

          {hasItem && (
            <a
              href={`https://www.wowhead.com/item=${item.itemId}`}
              data-wowhead={`item=${item.itemId}&ilvl=${item.ilevel}`}
              target="_blank"
              rel="noopener noreferrer"
              onClick={(e) => e.preventDefault()}
              aria-label={itemName ?? 'Item'}
              style={{
                position: 'absolute',
                inset: 0,
                cursor: 'pointer',
                zIndex: 10,
              }}
            >
              <span style={{ display: 'none' }}>{itemName ?? 'Item'}</span>
            </a>
          )}
        </Box>
      </Tooltip>

      {!isRight && <SlotStatusIndicator enchantResult={enchantResult} gemResult={gemResult} />}
      {isRight && renderDetails()}
    </Group>
  );
}

export default function CharacterGear({
  character,
  gearData,
  showBackgroundImage = false,
}: CharacterGearProps) {
  const { t } = useTranslation('tracking');
  const [showNotes, setShowNotes] = useState(true);

  const { data: fetchedData, isLoading } = useQuery<{ snapshot: GearSnapshot | null }>({
    queryKey: ['character', character.id, 'gear'],
    queryFn: async () => {
      const response = await api.get(`${API_VERSION}/character/${character.id}/gear/latest`);
      return response.data;
    },
    staleTime: 60_000,
    enabled: gearData === undefined, // skip if bulk data is supplied
  });

  const data = gearData !== undefined ? gearData : fetchedData;
  const loading = gearData !== undefined ? false : isLoading;

  useEffect(() => {
    if (!loading && !data?.snapshot) {
      setShowNotes(false);
    }
  }, [loading, data?.snapshot]);

  const { data: enchantData } = useQuery<{
    results: Array<{
      slot: string;
      isValid: boolean | null;
      reason: string;
      craftingQuality?: number | null;
      displayName?: string | null;
    }>;
    gems: Array<{
      slot: string;
      isValid: boolean | null;
      reason: string;
      rank: number | null;
      displayName?: string | null;
    }>;
    hasEpicGem?: boolean;
  }>({
    queryKey: ['character', character.id, 'enchantments', 'verify'],
    queryFn: async () => {
      const response = await api.get(`${API_VERSION}/enchantments/verify/${character.id}`);
      return response.data;
    },
    staleTime: 60_000,
    enabled: !!data?.snapshot,
  });

  const enchantBySlot = Object.fromEntries(
    (enchantData?.results ?? []).map((r) => [
      r.slot,
      {
        isValid: r.isValid,
        reason: r.reason,
        craftingQuality: r.craftingQuality,
        displayName: r.displayName,
      },
    ]),
  );

  const gemBySlot = Object.fromEntries(
    (enchantData?.gems ?? []).map((r) => [
      r.slot,
      { isValid: r.isValid, reason: r.reason, craftingQuality: r.rank, displayName: r.displayName },
    ]),
  );

  const hasEpicGem = enchantData?.hasEpicGem ?? true;

  if (loading) {
    return (
      <Card withBorder p="md" bg="dark.8">
        <Skeleton height={500} />
      </Card>
    );
  }

  const getItemForSlot = (slot: string) => {
    const gearItem = data?.snapshot?.items.find((i) => i.slot === slot);
    if (!gearItem) return null;
    return {
      itemId: gearItem.itemId,
      name: gearItem.item.name,
      icon: gearItem.item.icon,
      quality: gearItem.item.quality,
      ilevel: gearItem.ilevel,
      itemSource: gearItem.itemSource,
      upgradeFullName: gearItem.upgradeFullName,
      craftingQuality: gearItem.craftingQuality,
    };
  };

  const characterImage = character.thumbnail
    ? `https://render.worldofwarcraft.com/${(character.region || 'eu').toLowerCase()}/character/${character.thumbnail}`.replace(
        '-avatar.jpg',
        '-main-raw.png',
      )
    : '/src/default-character.png';

  return (
    <Card p={0} bg="transparent" withBorder={false} mt="xs" mb="xs">
      <Grid gutter="md">
        <Grid.Col span={showNotes ? 8 : 12}>
          <Box
            style={{
              position: 'relative',
              padding: '1.5rem 2rem',
              borderRadius: '8px',
              border: '1px solid var(--mantine-color-dark-4)',
              overflow: 'hidden',
              backgroundColor: 'var(--mantine-color-dark-8)',
              transition: 'transform 0.3s ease, opacity 0.3s ease',
            }}
          >
            {showBackgroundImage && (
              <Box
                style={{
                  position: 'absolute',
                  top: 0,
                  left: 0,
                  right: 0,
                  bottom: 0,
                  zIndex: 0,
                  backgroundImage: `url('/src/pages/whishlistPage/backgroundImage.webp')`,
                  backgroundSize: 'cover',
                  backgroundPosition: 'center',
                  filter: 'blur(4px)',
                  opacity: 0.5,
                }}
              />
            )}
            {!showNotes && (
              <Box
                style={{
                  position: 'absolute',
                  top: 0,
                  left: '50%',
                  transform: 'translateX(-50%)',
                  height: '100%',
                  width: '100%',
                  maxWidth: '500px',
                  zIndex: 1,
                  display: 'flex',
                  justifyContent: 'center',
                  overflow: 'hidden',
                  opacity: 0.6,
                  pointerEvents: 'none',
                }}
              >
                <Image
                  src={characterImage}
                  style={{
                    height: '100%',
                    width: 'auto',
                    objectFit: 'contain',
                    objectPosition: 'top center',
                    maskImage: 'linear-gradient(to bottom, black 60%, transparent 100%)',
                  }}
                />
              </Box>
            )}

            {!showNotes && (
              <ActionIcon
                variant="default"
                size="lg"
                radius="md"
                style={{
                  position: 'absolute',
                  top: '12px',
                  right: '12px',
                  zIndex: 10,
                  opacity: 0.8,
                }}
                onClick={() => setShowNotes(true)}
              >
                <IconNotebook size={18} />
              </ActionIcon>
            )}

            <div
              style={{
                position: 'relative',
                zIndex: 2,
                width: '100%',
                minHeight: showBackgroundImage ? '480px' : undefined,
                display: 'flex',
                alignItems: showBackgroundImage ? 'center' : 'flex-start',
                justifyContent: 'space-between',
                gap: '1rem',
              }}
            >
              <Stack
                gap="0"
                align="flex-start"
                style={{ width: showBackgroundImage ? '100%' : '320px', maxWidth: '45%' }}
              >
                {LEFT_SLOTS.map((slot) => (
                  <div
                    key={slot}
                    style={{
                      marginBottom: '8px',
                      display: 'flex',
                      justifyContent: 'flex-start',
                      width: '100%',
                    }}
                  >
                    <VisualGearSlot
                      slotKey={slot}
                      slotLabel={SLOT_NAMES[slot]}
                      slotIcon={SLOT_ICONS[slot]}
                      item={getItemForSlot(slot)}
                      isRight={false}
                      enchantResult={enchantBySlot[slot]}
                      gemResult={gemBySlot[slot]}
                    />
                  </div>
                ))}
                {BOTTOM_SLOTS.map((slot) => (
                  <div
                    key={slot}
                    style={{
                      marginBottom: '8px',
                      display: 'flex',
                      justifyContent: 'flex-start',
                      width: '100%',
                    }}
                  >
                    <VisualGearSlot
                      slotKey={slot}
                      slotLabel={SLOT_NAMES[slot]}
                      slotIcon={SLOT_ICONS[slot]}
                      item={getItemForSlot(slot)}
                      isRight={false}
                      enchantResult={enchantBySlot[slot]}
                    />
                  </div>
                ))}
              </Stack>

              <Stack
                gap="0"
                align="flex-end"
                style={{ width: showBackgroundImage ? '100%' : '320px', maxWidth: '45%' }}
              >
                {RIGHT_SLOTS.map((slot) => (
                  <div
                    key={slot}
                    style={{
                      marginBottom: '8px',
                      display: 'flex',
                      justifyContent: 'flex-end',
                      width: '100%',
                    }}
                  >
                    <VisualGearSlot
                      slotKey={slot}
                      slotLabel={SLOT_NAMES[slot]}
                      slotIcon={SLOT_ICONS[slot]}
                      item={getItemForSlot(slot)}
                      isRight={true}
                      enchantResult={enchantBySlot[slot]}
                      gemResult={gemBySlot[slot]}
                    />
                  </div>
                ))}
              </Stack>
            </div>
          </Box>
        </Grid.Col>

        {showNotes && (
          <Grid.Col span={4}>
            <Card withBorder h="100%" bg="dark.8" p="md">
              <Group justify="space-between" mb="sm">
                <Text fw={700} size="lg">
                  {t('gear.notes.title')}
                </Text>
                <ActionIcon variant="subtle" color="gray" onClick={() => setShowNotes(false)}>
                  <IconX size={18} />
                </ActionIcon>
              </Group>

              {(() => {
                if (!data?.snapshot) {
                  return (
                    <Text size="sm" c="dimmed" ta="center" mt="md">
                      {t('gear.notes.no_data')}
                    </Text>
                  );
                }

                const enchantAnomalies = Object.entries(enchantBySlot).filter(
                  ([, r]) =>
                    r.reason === 'missing' ||
                    r.reason === 'invalid' ||
                    (r.isValid && r.craftingQuality === 1),
                );
                const gemAnomalies = Object.entries(gemBySlot).filter(
                  ([, r]) =>
                    r.reason === 'missing' ||
                    r.reason === 'invalid' ||
                    (r.isValid && r.craftingQuality === 1),
                );

                if (enchantAnomalies.length === 0 && gemAnomalies.length === 0 && hasEpicGem)
                  return (
                    <Group gap={6}>
                      <IconCheck size={14} color="var(--mantine-color-green-5)" />
                      <Text size="sm" c="green.5">
                        {t('gear.notes.all_correct')}
                      </Text>
                    </Group>
                  );

                const renderRow = (slot: string, r: EnchantResult, type: 'enchant' | 'gem') => {
                  const label = SLOT_NAMES[slot] ?? slot;
                  if (r.reason === 'missing')
                    return (
                      <Group key={`${type}-${slot}`} gap={6} wrap="nowrap">
                        <IconX
                          size={13}
                          color="var(--mantine-color-red-5)"
                          style={{ flexShrink: 0 }}
                        />
                        <Text size="xs">
                          <Text span fw={500}>
                            {label}
                          </Text>{' '}
                          —{' '}
                          <Text span c="red.4">
                            {type === 'gem'
                              ? t('gear.notes.gem_missing')
                              : t('gear.notes.enchant_missing')}
                          </Text>
                        </Text>
                      </Group>
                    );
                  if (r.reason === 'invalid')
                    return (
                      <Stack key={`${type}-${slot}`} gap={0}>
                        <Group gap={6} wrap="nowrap">
                          <IconX
                            size={13}
                            color="var(--mantine-color-red-5)"
                            style={{ flexShrink: 0 }}
                          />
                          <Text size="xs">
                            <Text span fw={500}>
                              {label}
                            </Text>{' '}
                            —{' '}
                            <Text span c="red.4">
                              {type === 'gem'
                                ? t('gear.notes.gem_inferior')
                                : t('gear.notes.enchant_inferior')}
                            </Text>
                          </Text>
                        </Group>
                        {r.displayName && (
                          <Text size="xs" c="dimmed" ml={19}>
                            {r.displayName}
                          </Text>
                        )}
                      </Stack>
                    );
                  return (
                    <Stack key={`${type}-${slot}`} gap={0}>
                      <Group gap={6} wrap="nowrap">
                        <IconCheck
                          size={13}
                          color="var(--mantine-color-orange-5)"
                          style={{ flexShrink: 0 }}
                        />
                        <Text size="xs">
                          <Text span fw={500}>
                            {label}
                          </Text>{' '}
                          —{' '}
                          <Text span c="orange.4">
                            {t('gear.notes.rank_1')}
                          </Text>
                        </Text>
                      </Group>
                      {type === 'enchant' && r.displayName && (
                        <Text size="xs" c="dimmed" ml={19}>
                          {r.displayName}
                        </Text>
                      )}
                    </Stack>
                  );
                };

                return (
                  <Stack gap="sm">
                    {enchantAnomalies.length > 0 && (
                      <Stack gap={4}>
                        <Text size="xs" c="dimmed" tt="uppercase" fw={600} mb={2}>
                          {t('gear.notes.enchantments')}
                        </Text>
                        {enchantAnomalies.map(([slot, r]) => renderRow(slot, r, 'enchant'))}
                      </Stack>
                    )}
                    {gemAnomalies.length > 0 && (
                      <Stack gap={4}>
                        <Text size="xs" c="dimmed" tt="uppercase" fw={600} mb={2}>
                          {t('gear.notes.gems')}
                        </Text>
                        {gemAnomalies.map(([slot, r]) => renderRow(slot, r, 'gem'))}
                      </Stack>
                    )}
                    {!hasEpicGem && (
                      <Stack gap={4}>
                        <Text size="xs" c="dimmed" tt="uppercase" fw={600} mb={2}>
                          {t('gear.notes.epic_gem')}
                        </Text>
                        <Group gap={6} wrap="nowrap">
                          <IconX
                            size={13}
                            color="var(--mantine-color-red-5)"
                            style={{ flexShrink: 0 }}
                          />
                          <Text size="xs">
                            <Text span c="red.4">
                              {t('gear.notes.no_epic_gem')}
                            </Text>
                          </Text>
                        </Group>
                      </Stack>
                    )}
                  </Stack>
                );
              })()}
            </Card>
          </Grid.Col>
        )}
      </Grid>
    </Card>
  );
}
