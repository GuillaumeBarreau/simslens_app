const config = require('../shared/config');
const { parseClerkHost, parseAllowedAdminIds } = require('../middleware/clerkAuth');

describe('resolveSessionSecret', () => {
  it('throws in production when SESSION_SECRET is missing, short, or a known placeholder', () => {
    expect(() => config.resolveSessionSecret('', 'production')).toThrow(/SESSION_SECRET/);
    expect(() => config.resolveSessionSecret(null, 'production')).toThrow(/SESSION_SECRET/);
    expect(() => config.resolveSessionSecret('dev_secret_shhh', 'production')).toThrow(
      /SESSION_SECRET/,
    );
    expect(() =>
      config.resolveSessionSecret('change_me_to_something_secure_random', 'production'),
    ).toThrow(/SESSION_SECRET/);
    expect(() => config.resolveSessionSecret('short_secret', 'production')).toThrow(
      /SESSION_SECRET/,
    );
  });

  it('returns the trimmed secret in production when strong', () => {
    const strong = 'K8x9pL2mQ5vR7tY1wZ4bN6cM3jH0fG8d';
    expect(config.resolveSessionSecret(`  ${strong}  `, 'production')).toBe(strong);
  });

  it('falls back to dev_secret_shhh outside production when empty', () => {
    expect(config.resolveSessionSecret('', 'development')).toBe('dev_secret_shhh');
    expect(config.resolveSessionSecret(undefined, 'test')).toBe('dev_secret_shhh');
  });
});

describe('clerkAuth helpers', () => {
  it('parses a valid Clerk publishable key into its hostname', () => {
    const b64 = Buffer.from('clerk.simslens.com$').toString('base64');
    expect(parseClerkHost(`pk_live_${b64}`)).toBe('clerk.simslens.com');
    expect(parseClerkHost(`pk_test_${b64}`)).toBe('clerk.simslens.com');
  });

  it('rejects empty or malformed publishable keys', () => {
    expect(parseClerkHost('')).toBeNull();
    expect(parseClerkHost('invalid_key')).toBeNull();
    const badHost = Buffer.from('http://evil.com/path$').toString('base64');
    expect(parseClerkHost(`pk_test_${badHost}`)).toBeNull();
  });

  it('parses CLERK_ADMIN_USER_IDS into a Set of trimmed IDs', () => {
    const set = parseAllowedAdminIds(' user_123 , user_456 , ');
    expect(set).not.toBeNull();
    expect(Array.from(set || [])).toEqual(['user_123', 'user_456']);
    expect(parseAllowedAdminIds('')).toBeNull();
    expect(parseAllowedAdminIds(undefined)).toBeNull();
  });
});
