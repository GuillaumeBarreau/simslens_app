import { MantineProvider } from '@mantine/core';
import { render, screen, within } from '@testing-library/react';
import type { RaidGuest, RaidGuestAssignment } from 'services/event.service';
import type { RosterAssignment } from 'services/roster.service';

import {
  bossesOverCapacity,
  bossMembers,
  countByRole,
  raidCapacity,
  type RaidMember,
  splitIntoGroups,
} from './raidGroups';
import { RaidGroupsPanel } from './RaidGroupsPanel';

type Role = RosterAssignment['role'];

let nextId = 1;
const assignment = (
  characterId: number,
  role: Role,
  bossId = 1,
  position = 0,
): RosterAssignment => ({
  id: nextId++,
  eventId: 1,
  characterId,
  role,
  bossId,
  position,
  character: { id: characterId, name: `Char${characterId}`, class: 'Mage' },
});

const member = (key: string, role: Role = 'RANGED'): RaidMember => ({
  key,
  name: key,
  className: null,
  role,
  isGuest: false,
});

const members = (count: number, role: Role = 'RANGED') =>
  Array.from({ length: count }, (_, i) => member(`m${i + 1}`, role));

const guest: RaidGuest = {
  id: 50,
  eventId: 1,
  realmId: 1,
  name: 'Pug',
  role: 'HEALER',
  createdAt: '2026-01-01',
};

describe('bossMembers', () => {
  it('ne garde que le boss demandé, trié par rôle puis position', () => {
    const list = bossMembers(
      1,
      [
        assignment(1, 'RANGED', 1, 0),
        assignment(2, 'TANK', 1, 1),
        assignment(3, 'TANK', 1, 0),
        assignment(4, 'MELEE', 2, 0),
      ],
      [],
      [],
    );
    expect(list.map((m) => m.key)).toEqual(['c3', 'c2', 'c1']);
  });

  it('compte les invités placés sur le boss, après les personnages du même rôle', () => {
    const guestAssignments: RaidGuestAssignment[] = [
      { id: 1, guestId: 50, bossId: 1, role: 'HEALER' },
      { id: 2, guestId: 50, bossId: 2, role: 'HEALER' },
      { id: 3, guestId: 99, bossId: 1, role: 'TANK' },
    ];
    const list = bossMembers(1, [assignment(1, 'HEALER')], [guest], guestAssignments);
    expect(list.map((m) => [m.key, m.isGuest])).toEqual([
      ['c1', false],
      ['g50', true],
    ]);
  });

  it('ne compte un personnage qu’une fois', () => {
    const list = bossMembers(1, [assignment(1, 'TANK'), assignment(1, 'MELEE')], [], []);
    expect(list).toHaveLength(1);
  });
});

describe('countByRole', () => {
  it('compte tanks, soins, mêlée et distance', () => {
    expect(
      countByRole([member('a', 'TANK'), member('b', 'HEALER'), member('c', 'HEALER')]),
    ).toEqual({ TANK: 1, HEALER: 2, MELEE: 0, RANGED: 0 });
  });
});

describe('raidCapacity', () => {
  it('indique le dépassement', () => {
    expect(raidCapacity(22, 20)).toEqual({ count: 22, size: 20, over: 2, isOver: true });
  });

  it('un raid plein ou incomplet ne dépasse pas', () => {
    expect(raidCapacity(20, 20).isOver).toBe(false);
    expect(raidCapacity(3, 10)).toEqual({ count: 3, size: 10, over: 0, isOver: false });
  });
});

describe('splitIntoGroups', () => {
  it.each([
    [10, 2],
    [20, 4],
    [40, 8],
  ])('un raid à %i a %i groupes de 5, places vides comprises', (size, groupCount) => {
    const groups = splitIntoGroups(members(3), size);
    expect(groups).toHaveLength(groupCount);
    expect(groups.every((g) => g.slots.length === 5)).toBe(true);
    expect(groups.map((g) => g.number)).toEqual(
      Array.from({ length: groupCount }, (_, i) => i + 1),
    );
    expect(groups[0].slots.map((s) => s.member?.key ?? null)).toEqual([
      'm1',
      'm2',
      'm3',
      null,
      null,
    ]);
  });

  it('ajoute des groupes pour les joueurs en trop, marqués hors capacité', () => {
    const groups = splitIntoGroups(members(12), 10);
    expect(groups).toHaveLength(3);
    const flat = groups.flatMap((g) => g.slots);
    expect(flat.filter((s) => s.overCapacity).map((s) => s.member?.key ?? null)).toEqual([
      'm11',
      'm12',
      null,
      null,
      null,
    ]);
    expect(flat.slice(0, 10).every((s) => !s.overCapacity)).toBe(true);
  });
});

describe('bossesOverCapacity', () => {
  it('liste les boss au-delà de la taille', () => {
    const bosses = [
      { id: 1, name: 'A' },
      { id: 2, name: 'B' },
    ];
    const byBoss = new Map([
      [1, members(10)],
      [2, members(11)],
    ]);
    expect(bossesOverCapacity(bosses, byBoss, 10).map(({ boss }) => boss.id)).toEqual([2]);
  });
});

const renderPanel = (assignments: RosterAssignment[], raidSize = 10) =>
  render(
    <MantineProvider>
      <RaidGroupsPanel
        raidSize={raidSize}
        bosses={[{ id: 1, name: 'Onyxia' }]}
        assignments={assignments}
        guests={[]}
        guestAssignments={[]}
      />
    </MantineProvider>,
  );

describe('<RaidGroupsPanel />', () => {
  it('affiche les groupes de 5 et les compteurs', () => {
    renderPanel([assignment(1, 'TANK'), assignment(2, 'HEALER'), assignment(3, 'MELEE')]);

    expect(screen.getByTestId('raid-group-1')).toBeInTheDocument();
    expect(screen.getByTestId('raid-group-2')).toBeInTheDocument();
    expect(screen.queryByTestId('raid-group-3')).toBeNull();
    expect(within(screen.getByTestId('raid-group-1')).getByText('Char1')).toBeInTheDocument();
    expect(screen.getByTestId('raid-role-TANK')).toHaveTextContent('1');
    expect(screen.getByTestId('raid-role-RANGED')).toHaveTextContent('0');
    expect(screen.queryByTestId('raid-groups-over')).toBeNull();
  });

  it('alerte sans bloquer quand la taille est dépassée', () => {
    renderPanel(Array.from({ length: 12 }, (_, i) => assignment(i + 1, 'RANGED', 1, i)));

    expect(screen.getByTestId('raid-groups-over')).toBeInTheDocument();
    expect(screen.getByTestId('raid-group-3')).toBeInTheDocument();
    expect(within(screen.getByTestId('raid-group-3')).getByText('Char12')).toBeInTheDocument();
  });
});
