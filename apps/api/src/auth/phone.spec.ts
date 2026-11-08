import { normalizePhone } from './phone';

describe('normalizePhone', () => {
  it('normalizes +7 and 8XXXXXXXXXX to +7…', () => {
    expect(normalizePhone('+7 (900) 111-11-11')).toBe('+79001111111');
    expect(normalizePhone('8 900 111 11 11')).toBe('+79001111111');
    expect(normalizePhone('79001111111')).toBe('+79001111111');
  });

  it('accepts 10-digit local as +7…', () => {
    expect(normalizePhone('9001111111')).toBe('+79001111111');
  });

  it('rejects empty / garbage', () => {
    expect(normalizePhone('')).toBeNull();
    expect(normalizePhone('abc')).toBeNull();
    expect(normalizePhone('123')).toBeNull();
  });
});
