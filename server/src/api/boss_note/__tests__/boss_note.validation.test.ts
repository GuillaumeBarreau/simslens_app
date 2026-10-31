import {
  eventBossParam,
  MAX_ASSIGNMENTS,
  MAX_CONTENT_LENGTH,
  MAX_TASK_LENGTH,
  realmScopeQuery,
  saveBossNoteSchema,
} from '../boss_note.validation';

const opts = { abortEarly: false, stripUnknown: true, convert: true };

describe('eventBossParam', () => {
  it('converts both identifiers', () => {
    expect(eventBossParam.validate({ eventId: '1', bossId: '10' }, opts).value).toEqual({
      eventId: 1,
      bossId: 10,
    });
  });

  it('refuses an identifier that checkPermission would read differently', () => {
    expect(eventBossParam.validate({ eventId: '1e1', bossId: '10' }, opts).error).toBeDefined();
  });
});

describe('realmScopeQuery', () => {
  it('accepts a query without realm', () => {
    expect(realmScopeQuery.validate({}, opts).error).toBeUndefined();
  });
});

describe('saveBossNoteSchema', () => {
  it('accepts an empty note and defaults the assignments', () => {
    const { value, error } = saveBossNoteSchema.validate({ content: '' }, opts);
    expect(error).toBeUndefined();
    expect(value).toEqual({ content: '', assignments: [] });
  });

  it('requires the content', () => {
    expect(saveBossNoteSchema.validate({ assignments: [] }, opts).error).toBeDefined();
  });

  it('caps the length of the content', () => {
    const content = 'a'.repeat(MAX_CONTENT_LENGTH + 1);
    expect(saveBossNoteSchema.validate({ content }, opts).error).toBeDefined();
  });

  it('caps the number of assignments and the length of a task', () => {
    const many = Array.from({ length: MAX_ASSIGNMENTS + 1 }, () => ({ characterId: 1, task: 'x' }));
    expect(
      saveBossNoteSchema.validate({ content: '', assignments: many }, opts).error,
    ).toBeDefined();

    const long = [{ characterId: 1, task: 'x'.repeat(MAX_TASK_LENGTH + 1) }];
    expect(
      saveBossNoteSchema.validate({ content: '', assignments: long }, opts).error,
    ).toBeDefined();
  });

  it('refuses an assignment without a valid character', () => {
    const bad = [{ characterId: 0, task: 'x' }];
    expect(
      saveBossNoteSchema.validate({ content: '', assignments: bad }, opts).error,
    ).toBeDefined();
  });

  it('strips a realm sent in the body', () => {
    const { value } = saveBossNoteSchema.validate({ content: 'x', realmId: 9 }, opts);
    expect(value).not.toHaveProperty('realmId');
  });
});
