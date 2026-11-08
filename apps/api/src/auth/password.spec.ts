import { hashPassword, verifyPassword } from './password';

describe('password hashing', () => {
  it('hashes password differently from plaintext', async () => {
    const hash = await hashPassword('Demo123!');
    expect(hash).not.toBe('Demo123!');
    expect(hash.length).toBeGreaterThan(20);
  });

  it('verifies correct password', async () => {
    const hash = await hashPassword('Demo123!');
    await expect(verifyPassword('Demo123!', hash)).resolves.toBe(true);
  });

  it('rejects wrong password', async () => {
    const hash = await hashPassword('Demo123!');
    await expect(verifyPassword('wrong-pass', hash)).resolves.toBe(false);
  });
});
