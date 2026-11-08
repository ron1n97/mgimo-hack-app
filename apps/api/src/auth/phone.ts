/** Normalize phone to E.164-ish +7… for RU demo accounts. */
export function normalizePhone(input: string): string | null {
  const raw = input.trim();
  if (!raw) return null;
  const digits = raw.replace(/\D/g, '');
  if (!digits) return null;

  let national = digits;
  if (national.length === 11 && (national.startsWith('7') || national.startsWith('8'))) {
    national = '7' + national.slice(1);
  } else if (national.length === 10) {
    national = '7' + national;
  } else if (!national.startsWith('7') && national.length > 11) {
    // keep as-is for international demos
  }

  if (national.length < 10 || national.length > 15) return null;
  return `+${national}`;
}
