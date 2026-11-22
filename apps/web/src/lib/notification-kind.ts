/** Human label for notification.kind (announcements + system). */
export function notificationKindLabel(kind?: string): string {
  const k = (kind ?? "").toLowerCase();
  if (k.startsWith("deanery_") || k === "deanery_announce") return "Объявление";
  if (k.startsWith("schedule_")) return "Расписание";
  if (k.startsWith("grade_") || k === "academic_debt") return "Учёба";
  if (k.startsWith("digest_")) return "Дайджест";
  if (k.startsWith("request_")) return "Заявка";
  if (k.startsWith("staff_")) return "Деканат";
  return "Уведомление";
}

export function formatNotificationWhen(iso: string): string {
  const d = new Date(iso);
  if (Number.isNaN(d.getTime())) return iso;
  return d.toLocaleString("ru-RU", {
    timeZone: "Europe/Moscow",
    day: "numeric",
    month: "short",
    hour: "2-digit",
    minute: "2-digit",
  });
}
