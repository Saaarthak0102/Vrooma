import React from "react";

export interface SpecTableProps {
  specs?: Record<string, string>;
  features?: string[];
  variantName?: string;
}

export function SpecTable({ specs = {}, features = [], variantName }: SpecTableProps) {
  const specEntries = Object.entries(specs);

  return (
    <div className="space-y-10">
      {/* Specifications list with thin dividers */}
      {specEntries.length > 0 && (
        <div className="space-y-3">
          {variantName && (
            <p className="text-xs font-bold uppercase tracking-wider text-emerald-700">
              {variantName}
            </p>
          )}
          <div className="grid grid-cols-1 md:grid-cols-2 gap-x-12">
            {specEntries.map(([key, val]) => (
              <div
                key={key}
                className="flex items-center justify-between py-3 border-b border-border/60 text-xs sm:text-sm"
              >
                <span className="font-medium text-ink-soft">{key}</span>
                <span className="font-bold text-ink text-right ml-4">{val}</span>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* Key Variant Features - Compact information group */}
      {features.length > 0 && (
        <div className="space-y-3 pt-6 border-t border-border/60">
          <h4 className="text-xs font-bold uppercase tracking-wider text-ink-mute">
            Key Variant Features
          </h4>
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-x-8 gap-y-2.5">
            {features.map((feat, i) => (
              <div
                key={i}
                className="flex items-center gap-2.5 text-xs sm:text-sm text-ink py-1"
              >
                <span className="h-1.5 w-1.5 rounded-full bg-emerald-600 shrink-0" />
                <span className="font-medium">{feat}</span>
              </div>
            ))}
          </div>
        </div>
      )}
    </div>
  );
}

