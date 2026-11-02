import React from "react";

export interface WordsProps {
  text: string;
  className?: string;
  startIndex?: number;
}

/**
 * Server component that splits a string into words with CSS-driven staggered entrance.
 * Ensures zero JS delay for LCP headline paint.
 */
export function Words({ text, className = "", startIndex = 0 }: WordsProps) {
  const words = text.split(" ");

  return (
    <span className={`inline-block ${className}`.trim()}>
      {words.map((word, i) => (
        <span key={`${word}-${i}`} className="inline-block overflow-hidden align-top">
          <span
            className="w inline-block"
            style={{ "--i": startIndex + i } as React.CSSProperties}
          >
            {word}
          </span>
          {i < words.length - 1 && <span className="inline-block">&nbsp;</span>}
        </span>
      ))}
    </span>
  );
}
