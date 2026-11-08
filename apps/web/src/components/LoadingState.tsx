export function LoadingState({ label = "Загрузка…" }: { label?: string }) {
  return (
    <div className="flex flex-col items-center justify-center gap-3 py-16 text-ink-muted" role="status">
      <span
        className="h-8 w-8 animate-spin rounded-full border-2 border-cream-deep border-t-copper"
        aria-hidden
      />
      <p className="text-sm">{label}</p>
    </div>
  );
}
