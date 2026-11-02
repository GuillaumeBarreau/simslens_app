import { EventNotAccessibleError } from '../event.errors';
import { listEventPlayableClasses } from '../usecases/listEventPlayableClasses';

const findGame = vi.fn();

vi.mock('../event.repository', () => ({
  default: { findGame: (...a: unknown[]) => findGame(...a) },
}));

beforeEach(() => {
  findGame.mockReset();
});

describe('listEventPlayableClasses', () => {
  it('returns the 13 Retail classes for an event of a Retail guild', async () => {
    findGame.mockResolvedValue('retail');

    const result = await listEventPlayableClasses(12);

    expect(findGame).toHaveBeenCalledWith(12);
    expect(result.game).toBe('retail');
    expect(result.classes).toHaveLength(13);
    expect(result.classes).toEqual(
      expect.arrayContaining(['death_knight', 'demon_hunter', 'monk', 'evoker', 'warrior']),
    );
  });

  it('returns only the 9 vanilla classes for an event of a Forever guild', async () => {
    findGame.mockResolvedValue('forever');

    const result = await listEventPlayableClasses(7);

    expect(result).toEqual({
      game: 'forever',
      classes: [
        'warrior',
        'paladin',
        'hunter',
        'rogue',
        'priest',
        'shaman',
        'mage',
        'warlock',
        'druid',
      ],
    });
  });

  it('returns a copy: the caller cannot alter the game registry', async () => {
    findGame.mockResolvedValue('forever');

    const first = await listEventPlayableClasses(7);
    first.classes.push('monk');
    const second = await listEventPlayableClasses(7);

    expect(second.classes).not.toContain('monk');
  });

  it('answers 404 when the event does not exist', async () => {
    findGame.mockResolvedValue(null);

    await expect(listEventPlayableClasses(999)).rejects.toBeInstanceOf(EventNotAccessibleError);
  });
});
