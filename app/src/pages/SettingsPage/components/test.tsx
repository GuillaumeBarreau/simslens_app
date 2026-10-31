import { MantineProvider } from '@mantine/core';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { fireEvent, render, screen, waitFor, within } from '@testing-library/react';
import dayjs from 'dayjs';
import relativeTime from 'dayjs/plugin/relativeTime';
import enInvite from 'locales/en/inviteSettings.json';
import enValidation from 'locales/en/validationSettings.json';
import frInvite from 'locales/fr/inviteSettings.json';
import frValidation from 'locales/fr/validationSettings.json';

import { InviteCodesSettingsView } from './InviteCodesSettingsView';
import { ValidationSettingsView } from './ValidationSettingsView';

dayjs.extend(relativeTime);

// Seuil de fraîcheur des sims réglable par guilde (SIMS-228).

const flags = vi.hoisted(() => ({ simFreshness: true }));
const service = vi.hoisted(() => ({ getSettings: vi.fn(), updateSettings: vi.fn() }));
const notify = vi.hoisted(() => vi.fn());
const invites = vi.hoisted(() => ({
  getInviteCodes: vi.fn(),
  getGuestMembers: vi.fn(),
  createInviteCode: vi.fn(),
  deleteInviteCode: vi.fn(),
  removeGuestMember: vi.fn(),
}));

// `t` stable, comme celui d'i18next : la vue recharge ses réglages quand il change.
const t = vi.hoisted(() => (key: string) => key);
vi.mock('react-i18next', () => ({ useTranslation: () => ({ t }) }));

vi.mock('config/featureFlags', () => ({
  isFeatureEnabled: (feature: string) => (feature === 'sim-freshness' ? flags.simFreshness : true),
}));

vi.mock('contexts', () => ({
  useAuth: () => ({ user: { linkedCharacters: [{ id: 1, realmId: 7 }] }, selectedCharacterId: 1 }),
}));

vi.mock('@mantine/notifications', () => ({ notifications: { show: notify } }));

vi.mock('services/validationSettings.service', async (importOriginal) => ({
  ...(await importOriginal<typeof import('services/validationSettings.service')>()),
  validationSettingsService: service,
}));

vi.mock('services/invite.service', () => ({ inviteService: invites }));

const stored = {
  realmId: 7,
  allowedFightStyles: ['Patchwerk'],
  fightLength: 300,
  enemyCount: 1,
  raidBuffsConfig: {
    bloodlust: true,
    arcaneIntellect: true,
    fortitude: true,
    battleShout: true,
    mysticTouch: true,
    chaosBrand: true,
    skyfury: true,
    markOfTheWild: true,
    huntersMark: true,
    powerInfusion: false,
  },
  isDefault: false,
  simStaleAfterDays: 14,
};

let queryClient: QueryClient;

function renderView() {
  queryClient = new QueryClient({ defaultOptions: { mutations: { retry: false } } });
  vi.spyOn(queryClient, 'invalidateQueries');
  return render(
    <QueryClientProvider client={queryClient}>
      <MantineProvider>
        <ValidationSettingsView />
      </MantineProvider>
    </QueryClientProvider>,
  );
}

beforeEach(() => {
  flags.simFreshness = true;
  notify.mockReset();
  service.getSettings.mockReset().mockResolvedValue(stored);
  service.updateSettings.mockReset().mockResolvedValue(stored);
});

describe('<ValidationSettingsView /> — seuil de fraîcheur des sims', () => {
  it('affiche le seuil enregistré par la guilde', async () => {
    renderView();
    const input = await screen.findByLabelText('sim_freshness.label');
    expect(input).toHaveValue('14 sim_freshness.unit');
    expect(service.getSettings).toHaveBeenCalledWith(7);
  });

  it('enregistre le nouveau seuil et rafraîchit sa lecture (roster, suivi)', async () => {
    renderView();
    const input = await screen.findByLabelText('sim_freshness.label');
    fireEvent.change(input, { target: { value: '3' } });
    fireEvent.click(screen.getByRole('button', { name: 'save' }));

    await waitFor(() =>
      expect(service.updateSettings).toHaveBeenCalledWith(
        7,
        expect.objectContaining({ fightLength: 300, simStaleAfterDays: 3 }),
      ),
    );
    await waitFor(() =>
      expect(queryClient.invalidateQueries).toHaveBeenCalledWith({
        queryKey: ['validation-settings', 7],
      }),
    );
  });

  it('masque le champ et ne transmet pas de seuil tant que le drapeau est fermé', async () => {
    flags.simFreshness = false;
    renderView();
    fireEvent.click(await screen.findByRole('button', { name: 'save' }));

    await waitFor(() => expect(service.updateSettings).toHaveBeenCalled());
    expect(screen.queryByLabelText('sim_freshness.label')).toBeNull();
    expect(service.updateSettings.mock.calls[0][1]).not.toHaveProperty('simStaleAfterDays');
  });
});

describe('textes du seuil de fraîcheur', () => {
  it.each([
    ['fr', frValidation],
    ['en', enValidation],
  ])('existent en %s', (_lang, locale) => {
    for (const key of ['title', 'label', 'description', 'unit'] as const) {
      expect(locale.sim_freshness[key]).toBeTruthy();
    }
    expect(locale.sim_freshness.description).toContain('{{min}}');
    expect(locale.sim_freshness.description).toContain('{{max}}');
  });
});

const inviteCode = (id: number, code: string, overrides: Record<string, unknown> = {}) => ({
  id,
  realmId: 7,
  code,
  createdBy: '1',
  expiresAt: null,
  maxUses: 3,
  useCount: 0,
  createdAt: '2026-10-01T00:00:00Z',
  ...overrides,
});

function renderInvites() {
  queryClient = new QueryClient({ defaultOptions: { mutations: { retry: false } } });
  vi.spyOn(queryClient, 'invalidateQueries');
  return render(
    <QueryClientProvider client={queryClient}>
      <MantineProvider>
        <InviteCodesSettingsView />
      </MantineProvider>
    </QueryClientProvider>,
  );
}

describe('<InviteCodesSettingsView />', () => {
  beforeEach(() => {
    invites.getInviteCodes
      .mockReset()
      .mockResolvedValue([inviteCode(1, 'ACTIVE1'), inviteCode(2, 'USEDUP2', { useCount: 3 })]);
    invites.getGuestMembers.mockReset().mockResolvedValue([
      {
        id: 40,
        realmId: 7,
        userId: '55',
        joinedAt: '2026-10-10T00:00:00Z',
        inviteCode: null,
        character: { name: 'Velyndra', class: 'mage', realm: 'hyjal' },
      },
    ]);
    invites.createInviteCode.mockReset().mockResolvedValue(inviteCode(3, 'FRESH3'));
    invites.deleteInviteCode.mockReset().mockResolvedValue(undefined);
    invites.removeGuestMember.mockReset().mockResolvedValue(undefined);
  });

  it('separates usable codes from used up ones and lists guests by character', async () => {
    renderInvites();
    const active = await screen.findByRole('region', { name: 'codes.title' });
    await waitFor(() => expect(active).toHaveTextContent('ACTIVE1'));
    expect(active).not.toHaveTextContent('USEDUP2');
    expect(screen.getByRole('region', { name: 'codes.inactive_title' })).toHaveTextContent(
      'USEDUP2',
    );
    expect(await screen.findByText('Velyndra')).toBeInTheDocument();
    expect(invites.getInviteCodes).toHaveBeenCalledWith(7);
  });

  it('shows a useful empty state without codes nor guests', async () => {
    invites.getInviteCodes.mockResolvedValue([]);
    invites.getGuestMembers.mockResolvedValue([]);
    renderInvites();
    expect(await screen.findByText('codes.empty')).toBeInTheDocument();
    expect(await screen.findByText('guests.empty')).toBeInTheDocument();
  });

  it('generates a code and highlights its link', async () => {
    renderInvites();
    fireEvent.click(await screen.findByRole('button', { name: 'create.submit' }));
    await waitFor(() =>
      expect(invites.createInviteCode).toHaveBeenCalledWith(7, { expiresAt: null, maxUses: 1 }),
    );
    expect(await screen.findByText(`${window.location.origin}/invite/FRESH3`)).toBeInTheDocument();
    expect(queryClient.invalidateQueries).toHaveBeenCalledWith({ queryKey: ['inviteCodes', 7] });
  });

  it('revokes a code only after confirmation', async () => {
    renderInvites();
    const active = await screen.findByRole('region', { name: 'codes.title' });
    await waitFor(() => expect(active).toHaveTextContent('ACTIVE1'));
    fireEvent.click(screen.getByRole('button', { name: 'codes.revoke' }));
    expect(invites.deleteInviteCode).not.toHaveBeenCalled();

    const dialog = await screen.findByRole('dialog');
    fireEvent.click(within(dialog).getByRole('button', { name: 'codes.revoke' }));
    await waitFor(() => expect(invites.deleteInviteCode).toHaveBeenCalledWith(7, 1));
  });

  it('removes a guest only after confirmation', async () => {
    renderInvites();
    fireEvent.click(await screen.findByRole('button', { name: 'guests.remove' }));
    expect(invites.removeGuestMember).not.toHaveBeenCalled();

    const dialog = await screen.findByRole('dialog');
    fireEvent.click(within(dialog).getByRole('button', { name: 'guests.remove' }));
    await waitFor(() => expect(invites.removeGuestMember).toHaveBeenCalledWith(7, 40));
    expect(queryClient.invalidateQueries).toHaveBeenCalledWith({ queryKey: ['guestMembers', 7] });
  });
});

describe('textes des invitations', () => {
  const keys = (value: unknown, prefix = ''): string[] =>
    value && typeof value === 'object'
      ? Object.entries(value).flatMap(([k, v]) => keys(v, `${prefix}${k}.`))
      : [prefix.slice(0, -1)];

  it('ont les mêmes clés en français et en anglais', () => {
    expect(keys(frInvite).sort()).toEqual(keys(enInvite).sort());
  });
});
