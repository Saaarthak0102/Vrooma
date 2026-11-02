import React from "react";
import { cn } from "@/lib/utils";

export interface ContainerProps extends React.HTMLAttributes<HTMLDivElement> {
  children: React.ReactNode;
}

export function Container({ className, children, ...props }: ContainerProps) {
  return (
    <div
      className={cn("mx-auto w-full max-w-[var(--container-max)] px-4 sm:px-6 lg:px-8", className)}
      {...props}
    >
      {children}
    </div>
  );
}

export interface SectionProps extends React.HTMLAttributes<HTMLElement> {
  children: React.ReactNode;
  spacing?: "default" | "sm" | "lg" | "none";
}

export function Section({
  spacing = "default",
  className,
  children,
  ...props
}: SectionProps) {
  const spacingClasses = {
    none: "py-0",
    sm: "py-8 sm:py-12",
    default: "py-14 sm:py-20 lg:py-24",
    lg: "py-20 sm:py-28 lg:py-36",
  };

  return (
    <section className={cn(spacingClasses[spacing], className)} {...props}>
      {children}
    </section>
  );
}

