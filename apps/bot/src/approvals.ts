import type { ToolArgs } from '@dekanat/cabinet-tools';

export type PendingApproval = {
  id: string;
  telegramId: number;
  toolName: string;
  args: ToolArgs;
  createdAt: number;
  resolve: (ok: boolean) => void;
};

const pending = new Map<string, PendingApproval>();

export function createApproval(input: {
  telegramId: number;
  toolName: string;
  args: ToolArgs;
  timeoutMs?: number;
}): { id: string; promise: Promise<boolean> } {
  const id = `ap_${Date.now().toString(36)}_${Math.random().toString(36).slice(2, 8)}`;
  let resolve!: (ok: boolean) => void;
  const promise = new Promise<boolean>((r) => {
    resolve = r;
  });
  const entry: PendingApproval = {
    id,
    telegramId: input.telegramId,
    toolName: input.toolName,
    args: input.args,
    createdAt: Date.now(),
    resolve,
  };
  pending.set(id, entry);

  const timeout = input.timeoutMs ?? 120_000;
  setTimeout(() => {
    if (pending.has(id)) {
      pending.delete(id);
      resolve(false);
    }
  }, timeout);

  return { id, promise };
}

export function decideApproval(id: string, ok: boolean): boolean {
  const entry = pending.get(id);
  if (!entry) return false;
  pending.delete(id);
  entry.resolve(ok);
  return true;
}

export function getApproval(id: string): PendingApproval | undefined {
  return pending.get(id);
}

export function formatImpact(toolName: string, args: ToolArgs): string {
  if (toolName === 'create_request') {
    return [
      'Создать заявку в деканат:',
      `• тип: ${String(args.type ?? '—')}`,
      `• тема: ${String(args.title ?? '—')}`,
      `• текст: ${String(args.body ?? '').slice(0, 400)}`,
    ].join('\n');
  }
  if (toolName === 'update_request_status') {
    return [
      'Сменить статус заявки (сотрудник):',
      `• id: ${String(args.id ?? '—')}`,
      `• статус → ${String(args.status ?? '—')}`,
      args.note ? `• заметка: ${String(args.note)}` : '',
    ]
      .filter(Boolean)
      .join('\n');
  }
  return `${toolName}\n${JSON.stringify(args, null, 2).slice(0, 500)}`;
}
