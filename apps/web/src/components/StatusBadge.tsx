import type { RequestStatus } from "@/lib/types";

const labels: Record<RequestStatus, string> = {
  draft: "Черновик",
  submitted: "Отправлена",
  in_review: "На проверке",
  approved: "Одобрена",
  rejected: "Отклонена",
};

const styles: Record<RequestStatus, string> = {
  draft: "bg-ink/5 text-ink-muted",
  submitted: "bg-ink/10 text-ink",
  in_review: "bg-copper/15 text-copper-dark",
  approved: "bg-emerald-900/10 text-emerald-900",
  rejected: "bg-red-900/10 text-red-900",
};

export function StatusBadge({ status }: { status: RequestStatus }) {
  return (
    <span className={`inline-flex rounded-md px-2 py-0.5 text-xs font-medium ${styles[status]}`}>
      {labels[status]}
    </span>
  );
}
