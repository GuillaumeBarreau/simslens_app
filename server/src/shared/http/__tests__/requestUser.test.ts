import type { Request } from 'express';

import { UnauthorizedError } from '../../errors/AppError';
import { requireUserId } from '../requestUser';

const request = (user?: { id?: string }) => ({ user }) as unknown as Request;

describe('requireUserId', () => {
  it('returns the id of the signed-in user', () => {
    expect(requireUserId(request({ id: 'u1' }))).toBe('u1');
  });

  it('refuses a request without user, such as a bot call', () => {
    expect(() => requireUserId(request())).toThrow(UnauthorizedError);
  });

  it('refuses a user without id', () => {
    expect(() => requireUserId(request({}))).toThrow(UnauthorizedError);
  });
});
