import React from "react";
import { Container } from "@/components/ui/container";
import { Breadcrumbs, BreadcrumbItem } from "./Breadcrumbs";
import { cn } from "@/lib/utils";

export interface PageShellProps {
  title?: React.ReactNode;
  subtitle?: React.ReactNode;
  breadcrumbs?: BreadcrumbItem[];
  actions?: React.ReactNode;
  children: React.ReactNode;
  className?: string;
  containerClassName?: string;
}

export function PageShell({
  title,
  subtitle,
  breadcrumbs,
  actions,
  children,
  className,
  containerClassName,
}: PageShellProps) {
  return (
    <div className={cn("min-h-[75vh] py-6 sm:py-8", className)}>
      <Container className={containerClassName}>
        {breadcrumbs && <Breadcrumbs items={breadcrumbs} className="mb-2" />}

        {(title || actions) && (
          <div className="flex flex-col sm:flex-row sm:items-end justify-between gap-4 mb-8">
            <div>
              {typeof title === "string" ? (
                <h1 className="text-2xl sm:text-3xl font-extrabold tracking-tight text-ink">
                  {title}
                </h1>
              ) : (
                title
              )}
              {subtitle && (
                <p className="mt-1 text-sm text-ink-soft max-w-2xl leading-relaxed">
                  {subtitle}
                </p>
              )}
            </div>
            {actions && <div className="flex items-center gap-2">{actions}</div>}
          </div>
        )}

        {children}
      </Container>
    </div>
  );
}

