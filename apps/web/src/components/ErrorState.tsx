export function ErrorState({
  message,
  onRetry,
}: {
  message: string;
  onRetry?: () => void;
}) {
  return (
    <div
      className="rounded-2xl border border-copper/30 bg-copper/5 px-5 py-6 text-ink"
      role="alert"
    >
      <p className="font-medium">Не удалось загрузить</p>
      <p className="mt-2 text-sm text-ink-muted">{message}</p>
      {onRetry ? (
        <button
          type="button"
          onClick={onRetry}
          className="mt-4 rounded-lg bg-ink px-4 py-2 text-sm font-medium text-cream transition hover:bg-ink/90"
        >
          Повторить
        </button>
      ) : null}
    </div>
  );
}
