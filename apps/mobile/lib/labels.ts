import type { TicketStatus } from '@dekanat/shared';

export const TICKET_STATUS_RU: Record<TicketStatus, string> = {
  SUBMITTED: 'Подана',
  IN_PROGRESS: 'В работе',
  DONE: 'Готово',
  REJECTED: 'Отклонена',
};

export const CONTEST_DISCLAIMER =
  'Концепт конкурса MGIMO×AI Challenge. Не официальный сервис вуза.';

export const REQUEST_TYPES = [
  'Справка об обучении',
  'Академический отпуск',
  'Перенос экзамена',
  'Иное',
] as const;
