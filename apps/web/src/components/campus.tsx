import Link from "next/link";
import type {
  ButtonHTMLAttributes,
  InputHTMLAttributes,
  ReactNode,
} from "react";

/** Concept A «Кампус» × MGIMO — shared chrome, no university crest. */

export function PageHeader({
  title,
  action,
}: {
  title: string;
  action?: { href: string; label: string };
}) {
  return (
    <div className="mb-4 flex items-end justify-between gap-3">
      <h1 className="text-3xl font-semibold tracking-tight text-ink sm:text-4xl">
        {title}
      </h1>
      {action ? (
        <Link
          href={action.href}
          className="shrink-0 pb-1 text-sm font-medium text-link hover:underline"
        >
          {action.label}
        </Link>
      ) : null}
    </div>
  );
}

export function SectionHeader({
  title,
  action,
}: {
  title: string;
  action?: { href: string; label: string };
}) {
  return (
    <div className="mb-3 flex items-end justify-between gap-3">
      <h2 className="text-lg font-semibold tracking-tight text-ink">{title}</h2>
      {action ? (
        <Link
          href={action.href}
          className="shrink-0 text-sm font-medium text-link hover:underline"
        >
          {action.label}
        </Link>
      ) : null}
    </div>
  );
}

export function NowChip({ children = "Сейчас" }: { children?: ReactNode }) {
  return (
    <span className="inline-flex items-center rounded-md bg-accent px-2 py-0.5 text-[11px] font-semibold uppercase tracking-wide text-white">
      {children}
    </span>
  );
}

export function ListPanel({ children }: { children: ReactNode }) {
  return (
    <ul className="divide-y divide-cream-deep overflow-hidden rounded-xl border border-cream-deep bg-white">
      {children}
    </ul>
  );
}

export function ListRow({
  children,
  active,
  href,
}: {
  children: ReactNode;
  active?: boolean;
  href?: string;
}) {
  const inner = (
    <div
      className={`flex gap-3 px-4 py-3.5 ${
        active ? "bg-cream-deep/60" : "bg-white"
      }`}
    >
      {active ? (
        <span className="mt-1 w-1 shrink-0 self-stretch rounded-full bg-copper" aria-hidden />
      ) : (
        <span className="mt-1 w-1 shrink-0 self-stretch rounded-full bg-transparent" aria-hidden />
      )}
      <div className="min-w-0 flex-1">{children}</div>
    </div>
  );
  if (href) {
    return (
      <li>
        <Link href={href} className="block transition hover:bg-cream/80">
          {inner}
        </Link>
      </li>
    );
  }
  return <li>{inner}</li>;
}

export function SurfaceCard({
  children,
  className = "",
}: {
  children: ReactNode;
  className?: string;
}) {
  return (
    <div
      className={`rounded-xl border border-cream-deep bg-white p-4 sm:p-5 ${className}`}
    >
      {children}
    </div>
  );
}

export function PrimaryButton({
  children,
  className = "",
  ...props
}: ButtonHTMLAttributes<HTMLButtonElement>) {
  return (
    <button
      {...props}
      className={`w-full rounded-lg bg-copper py-3 text-sm font-semibold text-white transition hover:bg-copper-dark disabled:opacity-60 ${className}`}
    >
      {children}
    </button>
  );
}

export function FieldInput({
  className = "",
  ...props
}: InputHTMLAttributes<HTMLInputElement>) {
  return (
    <input
      {...props}
      className={`mt-1 w-full rounded-lg border border-cream-deep bg-white px-3 py-2.5 text-ink outline-none ring-copper/30 focus:ring-2 ${className}`}
    />
  );
}
