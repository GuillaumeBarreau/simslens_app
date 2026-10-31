import { ActionIcon, Badge, Button, Group, Stack, Table, Text, Title } from '@mantine/core';
import { useForm } from '@mantine/form';
import { notifications } from '@mantine/notifications';
import {
  IconCheck,
  IconPlus,
  IconShield,
  IconTrash,
  IconUser,
  IconUserCog,
  IconUserShield,
  IconX,
} from '@tabler/icons-react';
import { API_VERSION } from 'config/apiConstants';
import { useAuth } from 'contexts/AuthContext';
import type React from 'react';
import { useEffect, useState } from 'react';
import { useTranslation } from 'react-i18next';
import api from 'services/api';

import { Select } from '../../../design-system/atoms/Select';
import { Drawer } from '../../../design-system/organisms/Drawer';

interface RealmOwner {
  id: number;
  realmId: number;
  ownerId: string;
  role: 'owner' | 'admin' | 'moderator';
  characterName?: string;
  characterClass?: string | number;
}

interface RealmAdminDrawerProps {
  opened: boolean;
  onClose: () => void;
  realmId: number;
}

const RealmAdminDrawer: React.FC<RealmAdminDrawerProps> = ({ opened, onClose, realmId }) => {
  const { t } = useTranslation('roster');
  const { user } = useAuth();
  const currentUserId = user?.id?.toString();

  const [owners, setOwners] = useState<RealmOwner[]>([]);
  const [users, setUsers] = useState<{ userId: string; characterName: string }[]>([]);
  const [loading, setLoading] = useState(false);
  const [removeLoading, setRemoveLoading] = useState<string | null>(null);

  const addForm = useForm({
    initialValues: {
      ownerId: '',
      role: 'admin',
    },
    validate: {
      ownerId: (value) => (!value ? t('admin_drawer.fields.user.error') : null),
      role: (value) => (!value ? t('admin_drawer.fields.role.error') : null),
    },
  });

  const roleOptions = [
    { value: 'admin', label: t('admin_drawer.roles.admin') },
    { value: 'moderator', label: t('admin_drawer.roles.moderator') },
    { value: 'member', label: t('admin_drawer.roles.member') },
  ];

  const getRoleIcon = (role: string) => {
    switch (role) {
      case 'admin':
        return <IconShield size={16} />;
      case 'moderator':
        return <IconUserShield size={16} />;
      default:
        return <IconUser size={16} />;
    }
  };

  const getRoleBadgeColor = (role: string) => {
    switch (role) {
      case 'admin':
        return 'red';
      case 'moderator':
        return 'blue';
      default:
        return 'gray';
    }
  };

  const fetchOwners = async () => {
    setLoading(true);
    try {
      const response = await api.get(`${API_VERSION}/realms/${realmId}/owners`);
      setOwners(response.data);
    } catch (error: any) {
      notifications.show({
        title: t('notifications.error_title'),
        message: error.response?.data?.message || t('admin_drawer.notifications.load_error'),
        color: 'red',
        icon: <IconX size={16} />,
      });
    } finally {
      setLoading(false);
    }
  };

  const fetchUsers = async () => {
    try {
      const response = await api.get(`${API_VERSION}/realms/${realmId}/users`);
      setUsers(response.data);
    } catch (error: any) {
      console.error('Error fetching users:', error);
      // Don't show error notification for users, it's optional
    }
  };

  useEffect(() => {
    if (opened && realmId) {
      fetchOwners();
      fetchUsers();
    }
  }, [opened, realmId]);

  const handleAddOwner = async (values: typeof addForm.values) => {
    setLoading(true);
    if (values.role === 'member') {
      notifications.show({
        title: 'Info',
        message: t('admin_drawer.notifications.member_exists'),
        color: 'blue',
        icon: <IconUser size={16} />,
      });
      return;
    }

    try {
      await api.post(`${API_VERSION}/realms/${realmId}/owners`, {
        ownerId: values.ownerId,
        role: values.role,
      });

      notifications.show({
        title: t('notifications.success_title'),
        message: t('admin_drawer.notifications.add_success'),
        color: 'green',
        icon: <IconCheck size={16} />,
      });

      addForm.reset();
      fetchOwners();
    } catch (error: any) {
      notifications.show({
        title: t('notifications.error_title'),
        message: error.response?.data?.message || t('admin_drawer.notifications.add_error'),
        color: 'red',
        icon: <IconX size={16} />,
      });
    } finally {
      setLoading(false);
    }
  };

  const handleRemoveOwner = async (ownerId: string) => {
    setRemoveLoading(ownerId);
    try {
      await api.delete(`${API_VERSION}/realms/${realmId}/owners/${ownerId}`);

      notifications.show({
        title: t('notifications.success_title'),
        message: t('admin_drawer.notifications.remove_success'),
        color: 'green',
        icon: <IconCheck size={16} />,
      });

      fetchOwners();
    } catch (error: any) {
      notifications.show({
        title: t('notifications.error_title'),
        message: error.response?.data?.message || t('admin_drawer.notifications.remove_error'),
        color: 'red',
        icon: <IconX size={16} />,
      });
    } finally {
      setRemoveLoading(null);
    }
  };

  const handleUpdateRole = async (ownerId: string, newRole: string) => {
    if (newRole === 'member') {
      await handleRemoveOwner(ownerId);
      return;
    }

    try {
      await api.patch(`${API_VERSION}/realms/${realmId}/owners/${ownerId}`, {
        role: newRole,
      });

      notifications.show({
        title: t('notifications.success_title'),
        message: t('admin_drawer.notifications.update_success'),
        color: 'green',
        icon: <IconCheck size={16} />,
      });

      fetchOwners();
    } catch (error: any) {
      notifications.show({
        title: t('notifications.error_title'),
        message: error.response?.data?.message || t('admin_drawer.notifications.update_error'),
        color: 'red',
        icon: <IconX size={16} />,
      });
    }
  };

  return (
    <Drawer
      opened={opened}
      onClose={onClose}
      title={t('admin_drawer.title')}
      position="right"
      size="lg"
    >
      <Stack gap="xl">
        <Title order={3} mb="md">
          <Group gap="xs">
            <IconUserCog size={20} />
            {t('admin_drawer.add_title')}
          </Group>
        </Title>

        <form onSubmit={addForm.onSubmit(handleAddOwner)}>
          <Stack gap="md">
            <Select
              label={t('admin_drawer.fields.user.label')}
              placeholder={t('admin_drawer.fields.user.placeholder')}
              description={t('admin_drawer.fields.user.description')}
              data={Array.from(new Map(users.map((u) => [u.userId, u])).values()).map((u) => ({
                value: u.userId,
                label: `${u.characterName} (ID: ${u.userId})`,
              }))}
              searchable
              {...addForm.getInputProps('ownerId')}
              required
            />

            <Select
              label={t('admin_drawer.fields.role.label')}
              placeholder={t('admin_drawer.fields.role.placeholder')}
              data={roleOptions}
              {...addForm.getInputProps('role')}
              required
            />

            <Button
              bg="brand.5"
              type="submit"
              loading={loading}
              leftSection={<IconPlus size={16} />}
              fullWidth
            >
              {t('admin_drawer.buttons.add')}
            </Button>
          </Stack>
        </form>

        <Title order={3} mt="xl" mb="md">
          {t('admin_drawer.current_title')}
        </Title>

        {loading && owners.length === 0 ? (
          <Text c="dimmed">{t('admin_drawer.loading')}</Text>
        ) : owners.length === 0 ? (
          <Text c="dimmed">{t('admin_drawer.empty')}</Text>
        ) : (
          <Table>
            <Table.Thead>
              <Table.Tr>
                <Table.Th>{t('table.name')}</Table.Th>
                <Table.Th>{t('admin_drawer.fields.role.label')}</Table.Th>
                <Table.Th>{t('table.actions')}</Table.Th>
              </Table.Tr>
            </Table.Thead>
            <Table.Tbody>
              {owners.map((owner) => {
                const isCurrentUser = currentUserId && owner.ownerId === currentUserId;

                return (
                  <Table.Tr key={owner.ownerId}>
                    <Table.Td>
                      <Group gap="xs">
                        {owner.characterName ? (
                          <Text size="sm" fw={600} className={`class-${owner.characterClass}`}>
                            {owner.characterName}
                          </Text>
                        ) : (
                          <Text size="sm" c="dimmed" truncate="end" maw={200}>
                            {owner.ownerId}
                          </Text>
                        )}
                        {isCurrentUser && (
                          <Badge ml="xs" size="xs" color="cyan">
                            {t('admin_drawer.you')}
                          </Badge>
                        )}
                      </Group>
                    </Table.Td>
                    <Table.Td>
                      <Badge
                        color={getRoleBadgeColor(owner.role)}
                        leftSection={getRoleIcon(owner.role)}
                        variant="light"
                      >
                        {owner.role}
                      </Badge>
                    </Table.Td>
                    <Table.Td>
                      <Group gap="xs">
                        <Select
                          size="xs"
                          value={owner.role}
                          data={roleOptions}
                          onChange={(value) => value && handleUpdateRole(owner.ownerId, value)}
                          w={120}
                          disabled={!!isCurrentUser}
                          title={
                            isCurrentUser ? t('admin_drawer.tooltips.no_edit_self') : undefined
                          }
                        />
                        <ActionIcon
                          color="red"
                          variant="light"
                          onClick={() => handleRemoveOwner(owner.ownerId)}
                          loading={removeLoading === owner.ownerId}
                          disabled={!!isCurrentUser}
                          title={
                            isCurrentUser ? t('admin_drawer.tooltips.no_delete_self') : undefined
                          }
                        >
                          <IconTrash size={16} />
                        </ActionIcon>
                      </Group>
                    </Table.Td>
                  </Table.Tr>
                );
              })}
            </Table.Tbody>
          </Table>
        )}
      </Stack>
    </Drawer>
  );
};

export default RealmAdminDrawer;
