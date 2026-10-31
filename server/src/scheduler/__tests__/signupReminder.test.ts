// Premier rappel de raid : heure de clôture dans le fuseau du royaume (SIMS-204).
import { signupLockTime, signupReminderHeadline } from '../signupReminder';

const start = new Date('2026-02-03T20:00:00Z');

describe('signupLockTime', () => {
  it('is lockHours before the start of the raid', () => {
    expect(signupLockTime(start, 24)).toEqual(new Date('2026-02-02T20:00:00Z'));
  });
});

describe('signupReminderHeadline', () => {
  it('announces the closing in the realm time zone', () => {
    expect(signupReminderHeadline(start, 24, 'Europe/Paris')).toBe(
      '📢 **Inscriptions au raid bientôt fermées !** Clôture lundi 2 février à 21:00.',
    );
    expect(signupReminderHeadline(start, 24, 'America/New_York')).toContain(
      'lundi 2 février à 15:00',
    );
  });

  it('falls back to the default time zone', () => {
    expect(signupReminderHeadline(start, 24, null)).toContain('à 21:00');
  });
});
