import React from "react";

/** The "assistant is typing" dots shown in a bot bubble while an answer (which may call tools) is being prepared. */
export function TypingDots() {
  return (
    <span role="status" aria-label="Assistant is typing" className="typing-dots inline-flex items-center gap-1 py-1">
      <span />
      <span />
      <span />
    </span>
  );
}
