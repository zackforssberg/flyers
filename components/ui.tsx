import type { ReactNode } from "react";
import { strings } from "@/lib/strings";

export function Card({
  title,
  subtitle,
  href,
  children,
}: {
  title: string;
  subtitle?: string;
  href?: string;
  children: ReactNode;
}) {
  const heading = (
    <div className="mb-3 flex items-baseline justify-between gap-2">
      <div>
        <h2 className="text-lg font-semibold text-flyers-blue">{title}</h2>
        {subtitle && <p className="text-xs text-flyers-muted">{subtitle}</p>}
      </div>
      {href && (
        <span className="shrink-0 text-sm font-medium text-flyers-blue" aria-hidden>
          →
        </span>
      )}
    </div>
  );

  return (
    <section className="rounded-2xl bg-white p-4 shadow-sm ring-1 ring-flyers-line">
      {href ? (
        <a href={href} className="block rounded-lg hover:opacity-90">
          {heading}
        </a>
      ) : (
        heading
      )}
      {children}
    </section>
  );
}

export function EmptyState({ children }: { children: ReactNode }) {
  return <p className="py-4 text-center text-sm text-flyers-muted">{children}</p>;
}

export function PageTitle({ children }: { children: ReactNode }) {
  return <h1 className="mb-4 text-2xl font-bold text-flyers-blue">{children}</h1>;
}

export function Loading() {
  return (
    <p className="py-10 text-center text-sm text-flyers-muted" role="status">
      {strings.common.loading}
    </p>
  );
}
