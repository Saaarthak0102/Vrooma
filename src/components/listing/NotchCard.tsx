import React from "react";

export interface NotchCardProps extends React.HTMLAttributes<HTMLElement> {
  children: React.ReactNode;
  className?: string;
  as?: "article" | "div";
  isBooked?: boolean;
}

export function NotchCard({
  children,
  className = "",
  as: Component = "article",
  isBooked = false,
  ...props
}: NotchCardProps) {
  return (
    <Component
      className={`notch-card ${isBooked ? "is-booked" : ""} ${className}`}
      {...props}
    >
      {children}
    </Component>
  );
}

