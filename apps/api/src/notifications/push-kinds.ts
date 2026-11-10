/** Kinds that trigger Web Push fan-out (ADR 0009). */
export function shouldSendWebPush(kind: string): boolean {
  return kind.startsWith('grade_') || kind.startsWith('digest_');
}
