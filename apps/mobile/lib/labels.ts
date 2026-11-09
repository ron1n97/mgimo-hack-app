import type { TicketStatus } from '@dekanat/shared';

export const TICKET_STATUS_RU: Record<TicketStatus, string> = {
  SUBMITTED: 'Подана',
  IN_PROGRESS: 'В работе',
  DONE: 'Готово',
  REJECTED: 'Отклонена',
};

export const CONTEST_DISCLAIMER =
  'Неофициальный кабинет. Расписание — из открытого RUZ МГИМО.';

export const REQUEST_TYPES = [
  'Справка об обучении',
  'Академический отпуск',
  'Перенос экзамена',
  'Иное',
] as const;
