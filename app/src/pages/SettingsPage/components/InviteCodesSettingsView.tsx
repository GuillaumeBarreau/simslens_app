import {
  ActionIcon,
  Alert,
  Button,
  CopyButton,
  Group,
  NumberInput,
  Skeleton,
  Stack,
  Text,
  Tooltip,
} from '@mantine/core';
import { DatePickerInput } from '@mantine/dates';
import { notifications } from '@mantine/notifications';
import {
  IconCalendarTime,
  IconCheck,
  IconCopy,
  IconLink,
  IconTicket,
  IconTicketOff,
  IconTrash,
  IconUser,
  IconUsers,
} from '@tabler/icons-react';
import { ConfirmModal } from 'components/design-system/organisms';
import { SettingsGroup, SettingsRow } from 'components/design-system/organisms/SettingsGroup';
import { CLASS_COLORS } from 'constants/classes';
import { useAuth } from 'contexts';
import dayjs from 'dayjs';
import {
  useCreateInviteCode,
  useDeleteInviteCode,
  useGuestMembers,
  useInviteCodes,
  useRemoveGuestMember,
  useUserRealm,
} from 'hooks/queries';
import { type ReactNode, useState } from 'react';
import { useTranslation } from 'react-i18next';
import type { GuestMember, InviteCode } from 'services/invite.service';
import {
  buildInviteLink,
  getInviteCodeStatus,
  splitInviteCodes,
  toInviteExpiryPayload,
} from 'utils/inviteCodes';
import { normalizeClass } from 'utils/normalizeClass';

type PendingAction =
  | { kind: 'revoke'; code: InviteCode }
  | { kind: 'delete'; code: InviteCode }
  | { kind: 'remove'; guest: GuestMember }
  | null;

const ICON = { size: 20, stroke: 1.5 } as const;

function DateHint({ date, children }: { date: string; children: ReactNode }) {
  return (
    <Tooltip label={dayjs(date).format('D MMMM YYYY, HH:mm')} withArrow openDelay={200}>
      <span style={{ textDecoration: 'underline dotted', textUnderlineOffset: 3 }}>{children}</span>
    </Tooltip>
  );
}

function EmptyRow({ icon, text }: { icon: ReactNode; text: string }) {
  return (
    <SettingsRow
      icon={<span style={{ display: 'flex', opacity: 0.6 }}>{icon}</span>}
      title={
        <Text component="span" size="sm" c="dimmed">
          {text}
        </Text>
      }
    />
  );
}

function RowsSkeleton() {
  return (
    <>
      {[0, 1].map((i) => (
        <SettingsRow
          key={i}
          icon={<Skeleton circle h={20} w={20} />}
          title={<Skeleton h={14} w={160} my={2} />}
          description={<Skeleton h={10} w={220} mt={6} />}
        />
      ))}
    </>
  );
}

export function InviteCodesSettingsView() {
  const { t } = useTranslation('inviteSettings');
  const { user, selectedCharacterId } = useAuth();
  const charRealmId = user?.linkedCharacters?.find((c) => c.id === selectedCharacterId)?.realmId;
  const { data: realmData } = useUserRealm(user?.id ? String(user.id) : null, {
    enabled: !charRealmId,
  });
  const realmId = (charRealmId ?? realmData?.id) as number | undefined;

  const [expiresAt, setExpiresAt] = useState<string | null>(null);
  const [maxUses, setMaxUses] = useState<number | string>(1);
  const [created, setCreated] = useState<InviteCode | null>(null);
  const [pending, setPending] = useState<PendingAction>(null);

  const { data: codes = [], isLoading: codesLoading } = useInviteCodes(realmId);
  const { data: guests = [], isLoading: guestsLoading } = useGuestMembers(realmId);
  const createCode = useCreateInviteCode(realmId);
  const deleteCode = useDeleteInviteCode(realmId);
  const removeGuest = useRemoveGuestMember(realmId);

  const { active, inactive } = splitInviteCodes(codes);
  const linkFor = (code: string) => buildInviteLink(window.location.origin, code);

  const showError = () =>
    notifications.show({
      title: t('notifications.error_title'),
      message: t('notifications.error'),
      color: 'red',
    });

  const handleCreate = async () => {
    try {
      const code = await createCode.mutateAsync({
        expiresAt: toInviteExpiryPayload(expiresAt),
        maxUses: typeof maxUses === 'number' ? maxUses : 1,
      });
      setCreated(code);
      setExpiresAt(null);
      setMaxUses(1);
    } catch {
      showError();
    }
  };

  const handleConfirm = async () => {
    if (!pending) return;
    try {
      if (pending.kind === 'remove') {
        await removeGuest.mutateAsync(pending.guest.id);
        notifications.show({ message: t('notifications.removed'), color: 'green' });
      } else {
        await deleteCode.mutateAsync(pending.code.id);
        if (created?.id === pending.code.id) setCreated(null);
        notifications.show({
          message: t(pending.kind === 'revoke' ? 'notifications.revoked' : 'notifications.deleted'),
          color: 'green',
        });
      }
      setPending(null);
    } catch {
      showError();
    }
  };

  const guestName = (guest: GuestMember) =>
    guest.character?.name ?? t('guests.unknown_character', { id: guest.userId });

  const copyLinkButton = (code: string, variant: 'compact' | 'primary') => (
    <CopyButton value={linkFor(code)} timeout={1800}>
      {({ copied, copy }) =>
        variant === 'primary' ? (
          <Button
            color="brand.5"
            size="sm"
            leftSection={copied ? <IconCheck size={16} /> : <IconCopy size={16} />}
            onClick={copy}
          >
            {copied ? t('codes.copied') : t('codes.copy_link')}
          </Button>
        ) : (
          <Button
            variant="subtle"
            color="gray"
            size="xs"
            leftSection={copied ? <IconCheck size={14} /> : <IconLink size={14} />}
            onClick={copy}
          >
            {copied ? t('codes.copied') : t('codes.copy_link')}
          </Button>
        )
      }
    </CopyButton>
  );

  const codeDescription = (code: InviteCode) => {
    const status = getInviteCodeStatus(code);
    const uses = t('codes.uses', { used: code.useCount, max: code.maxUses, count: code.maxUses });
    let expiry: ReactNode = t('codes.never_expires');
    if (code.expiresAt) {
      const relative = dayjs(code.expiresAt).fromNow();
      expiry = (
        <DateHint date={code.expiresAt}>
          {t(status === 'expired' ? 'codes.expired' : 'codes.expires', { relative })}
        </DateHint>
      );
    }
    return (
      <>
        {uses}
        {status === 'exhausted' && ` · ${t('codes.exhausted')}`}
        {' · '}
        {expiry}
      </>
    );
  };

  const codeTitle = (code: string) => (
    <Text component="span" ff="monospace" fw={600} size="sm" lts={0.5}>
      {code}
    </Text>
  );

  return (
    <Stack gap="lg" maw={800}>
      <Alert color="brand.5" variant="light">
        <Text size="sm">{t('intro')}</Text>
      </Alert>

      <Stack gap="sm">
        <SettingsGroup title={t('create.title')}>
          <SettingsRow
            icon={<IconCalendarTime {...ICON} />}
            title={t('create.expiry_label')}
            description={t('create.expiry_description')}
            labelFor="invite-expiry"
            controlWidth={220}
            control={
              <DatePickerInput
                id="invite-expiry"
                placeholder={t('create.expiry_placeholder')}
                value={expiresAt}
                onChange={setExpiresAt}
                clearable
                minDate={dayjs().format('YYYY-MM-DD')}
                valueFormat="D MMMM YYYY"
              />
            }
          />
          <SettingsRow
            icon={<IconUsers {...ICON} />}
            title={t('create.max_uses_label')}
            description={t('create.max_uses_description')}
            labelFor="invite-max-uses"
            controlWidth={220}
            control={
              <NumberInput
                id="invite-max-uses"
                value={maxUses}
                onChange={setMaxUses}
                min={1}
                max={100}
                clampBehavior="strict"
                allowDecimal={false}
              />
            }
          />
          {created && (
            <SettingsRow
              icon={<IconCheck {...ICON} color="var(--mantine-color-brand-4)" />}
              title={
                <Group gap="xs" component="span">
                  {t('create.created_title')}
                  {codeTitle(created.code)}
                </Group>
              }
              description={
                <>
                  {t('create.created_description')}
                  <Text
                    component="span"
                    display="block"
                    ff="monospace"
                    size="xs"
                    c="gray.3"
                    mt={4}
                    style={{ wordBreak: 'break-all' }}
                  >
                    {linkFor(created.code)}
                  </Text>
                </>
              }
              control={copyLinkButton(created.code, 'primary')}
            />
          )}
        </SettingsGroup>
        <Group>
          <Button
            color="brand.5"
            variant={created ? 'default' : 'filled'}
            leftSection={<IconTicket size={16} />}
            onClick={handleCreate}
            loading={createCode.isPending}
            disabled={!realmId}
          >
            {t('create.submit')}
          </Button>
        </Group>
      </Stack>

      <SettingsGroup title={t('codes.title')}>
        {codesLoading ? (
          <RowsSkeleton />
        ) : active.length === 0 ? (
          <EmptyRow icon={<IconTicketOff {...ICON} />} text={t('codes.empty')} />
        ) : (
          active.map((code) => (
            <SettingsRow
              key={code.id}
              icon={<IconTicket {...ICON} />}
              title={codeTitle(code.code)}
              description={codeDescription(code)}
              control={
                <Group gap={4} wrap="nowrap">
                  {copyLinkButton(code.code, 'compact')}
                  <Tooltip label={t('codes.revoke')} withArrow>
                    <ActionIcon
                      variant="subtle"
                      color="red"
                      aria-label={t('codes.revoke')}
                      onClick={() => setPending({ kind: 'revoke', code })}
                    >
                      <IconTrash size={16} />
                    </ActionIcon>
                  </Tooltip>
                </Group>
              }
            />
          ))
        )}
      </SettingsGroup>

      {inactive.length > 0 && (
        <SettingsGroup
          title={t('codes.inactive_title')}
          description={t('codes.inactive_description')}
        >
          {inactive.map((code) => (
            <SettingsRow
              key={code.id}
              icon={<IconTicketOff {...ICON} />}
              title={codeTitle(code.code)}
              description={codeDescription(code)}
              dimmed
              control={
                <Tooltip label={t('codes.delete')} withArrow>
                  <ActionIcon
                    variant="subtle"
                    color="gray"
                    aria-label={t('codes.delete')}
                    onClick={() => setPending({ kind: 'delete', code })}
                  >
                    <IconTrash size={16} />
                  </ActionIcon>
                </Tooltip>
              }
            />
          ))}
        </SettingsGroup>
      )}

      <SettingsGroup title={t('guests.title')}>
        {guestsLoading ? (
          <RowsSkeleton />
        ) : guests.length === 0 ? (
          <EmptyRow icon={<IconUser {...ICON} />} text={t('guests.empty')} />
        ) : (
          guests.map((guest) => {
            const color = guest.character
              ? CLASS_COLORS[normalizeClass(guest.character.class)]
              : undefined;
            return (
              <SettingsRow
                key={guest.id}
                icon={<IconUser {...ICON} color={color} />}
                title={
                  <Group gap={6} component="span" wrap="wrap">
                    <Text component="span" size="sm" fw={600} c={color}>
                      {guestName(guest)}
                    </Text>
                    {guest.character && (
                      <Text component="span" size="xs" c="dimmed" tt="capitalize">
                        {guest.character.realm}
                      </Text>
                    )}
                  </Group>
                }
                description={
                  <>
                    <DateHint date={guest.joinedAt}>
                      {t('guests.joined', { relative: dayjs(guest.joinedAt).fromNow() })}
                    </DateHint>
                    {guest.inviteCode && (
                      <>
                        {' · '}
                        {t('guests.via_code', { code: guest.inviteCode.code })}
                      </>
                    )}
                  </>
                }
                control={
                  <Button
                    variant="subtle"
                    color="red"
                    size="xs"
                    onClick={() => setPending({ kind: 'remove', guest })}
                  >
                    {t('guests.remove')}
                  </Button>
                }
              />
            );
          })
        )}
      </SettingsGroup>

      <ConfirmModal
        opened={pending !== null}
        onClose={() => setPending(null)}
        onConfirm={handleConfirm}
        isLoading={deleteCode.isPending || removeGuest.isPending}
        cancelLabel={t('confirm.cancel')}
        title={
          pending?.kind === 'remove'
            ? t('confirm.remove_title')
            : pending?.kind === 'delete'
              ? t('confirm.delete_title')
              : t('confirm.revoke_title')
        }
        confirmLabel={
          pending?.kind === 'remove'
            ? t('guests.remove')
            : pending?.kind === 'delete'
              ? t('codes.delete')
              : t('codes.revoke')
        }
        message={
          pending?.kind === 'remove'
            ? t('confirm.remove_message', { name: guestName(pending.guest) })
            : pending
              ? t(pending.kind === 'delete' ? 'confirm.delete_message' : 'confirm.revoke_message', {
                  code: pending.code.code,
                })
              : ''
        }
      />
    </Stack>
  );
}
