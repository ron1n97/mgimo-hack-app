export function EmptyState({
  title,
  description,
}: {
  title: string;
  description?: string;
}) {
  return (
    <div className="rounded-2xl border border-dashed border-cream-deep bg-white/40 px-5 py-10 text-center">
      <p className="font-serif text-lg text-ink">{title}</p>
      {description ? <p className="mt-2 text-sm text-ink-muted">{description}</p> : null}
    </div>
  );
}
