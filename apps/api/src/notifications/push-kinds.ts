/** Kinds that trigger Web Push fan-out (ADR 0013). */
export function shouldSendWebPush(kind: string): boolean {
  return (
    kind.startsWith('grade_') ||
    kind.startsWith('digest_') ||
    kind.startsWith('deanery_') ||
    kind.startsWith('schedule_')
  );
}
