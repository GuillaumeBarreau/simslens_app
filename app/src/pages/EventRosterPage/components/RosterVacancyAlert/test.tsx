import { MantineProvider } from '@mantine/core';
import { fireEvent, render, screen } from '@testing-library/react';
import type { RosterVacancy } from 'services/roster.service';

import { RosterVacancyAlert, vacancyKey } from './RosterVacancyAlert';

const vacancy = (over: Partial<RosterVacancy> = {}): RosterVacancy => ({
  bossId: 1,
  characterId: 10,
  characterName: 'Absentmage',
  class: 'Mage',
  spec: 'Frost',
  role: 'RANGED',
  lostBuffs: ['arcaneIntellect'],
  replacements: [
    {
      characterId: 20,
      name: 'Firstpick',
      class: 'Mage',
      spec: 'Fire',
      isPrimaryRole: true,
      coveredBuffs: ['arcaneIntellect'],
      bisCount: 0,
      bestGain: 0,
    },
    {
      characterId: 21,
      name: 'Secondpick',
      class: 'Warlock',
      spec: 'Affliction',
      isPrimaryRole: true,
      coveredBuffs: [],
      bisCount: 2,
      bestGain: 1200,
    },
    {
      characterId: 22,
      name: 'Thirdpick',
      class: 'Priest',
      spec: 'Holy',
      isPrimaryRole: false,
      coveredBuffs: [],
      bisCount: 0,
      bestGain: 0,
    },
  ],
  ...over,
});

const renderAlert = (props: Partial<Parameters<typeof RosterVacancyAlert>[0]> = {}) => {
  const onReplace = vi.fn();
  render(
    <MantineProvider>
      <RosterVacancyAlert
        vacancies={[vacancy()]}
        bossNames={new Map([[1, 'Boss One']])}
        onReplace={onReplace}
        pendingKey={null}
        {...props}
      />
    </MantineProvider>,
  );
  return { onReplace };
};

describe('<RosterVacancyAlert />', () => {
  it('renders nothing without vacancy', () => {
    const { container } = render(
      <MantineProvider>
        <RosterVacancyAlert
          vacancies={[]}
          bossNames={new Map()}
          onReplace={vi.fn()}
          pendingKey={null}
        />
      </MantineProvider>,
    );
    expect(container.querySelector('[data-testid^="vacancy-"]')).toBeNull();
  });

  it('lists the ranked replacements in order', () => {
    renderAlert();
    const names = ['Firstpick', 'Secondpick', 'Thirdpick'].map((n) => screen.getByText(n));
    expect(
      names[0].compareDocumentPosition(names[1]) & Node.DOCUMENT_POSITION_FOLLOWING,
    ).toBeTruthy();
    expect(
      names[1].compareDocumentPosition(names[2]) & Node.DOCUMENT_POSITION_FOLLOWING,
    ).toBeTruthy();
  });

  it('replaces the holder with the chosen replacement in one click', () => {
    const { onReplace } = renderAlert();
    fireEvent.click(screen.getAllByRole('button')[1]);
    expect(onReplace).toHaveBeenCalledWith(
      expect.objectContaining({ characterId: 10, bossId: 1 }),
      expect.objectContaining({ characterId: 21 }),
    );
  });

  it('disables the other buttons while a replacement is pending', () => {
    const other = vacancy({ bossId: 2, characterId: 11 });
    renderAlert({ vacancies: [vacancy(), other], pendingKey: vacancyKey(vacancy()) });
    const buttons = screen.getAllByRole('button');
    expect(buttons.slice(3).every((b) => b.hasAttribute('disabled'))).toBe(true);
  });

  it('warns that a replacement without specialization has to define one', () => {
    const base = vacancy();
    renderAlert({
      vacancies: [
        vacancy({
          replacements: [
            { ...base.replacements[0], spec: null, missingSpecialization: true },
            base.replacements[1],
          ],
        }),
      ],
    });
    expect(screen.getAllByText('vacancies.missingSpec')).toHaveLength(1);
  });

  it('says when no replacement is available', () => {
    renderAlert({ vacancies: [vacancy({ replacements: [] })] });
    expect(screen.queryAllByRole('button')).toHaveLength(0);
    expect(screen.getByText('vacancies.noReplacement')).toBeInTheDocument();
  });
});
