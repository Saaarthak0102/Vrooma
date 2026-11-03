import React from "react";

export interface NotchTagProps {
  label: string;
  hasAccentDot?: boolean;
  className?: string;
}

export function NotchTag({
  label,
  hasAccentDot = false,
  className = "",
}: NotchTagProps) {
  if (!label) return null;

  return (
    <div className={`notch-tag ${className}`}>
      {/* Concave filler square above tab */}
      <span className="notch-tag-filler-top" aria-hidden="true" />
      {/* Concave filler square to the right of tab */}
      <span className="notch-tag-filler-right" aria-hidden="true" />

      <span className="notch-tag-label">
        {hasAccentDot && (
          <span
            className="w-1.5 h-1.5 rounded-full bg-accent mr-1.5 shrink-0 inline-block"
            aria-hidden="true"
          />
        )}
        <span>{label}</span>
      </span>
    </div>
  );
}

