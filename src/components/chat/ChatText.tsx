import React from "react";
import Link from "next/link";
import { SITE_PATH_PREFIXES } from "@/server/ai/guard";

const escape = (s: string) => s.replace(/[.*+?^${}()|[\]\/]/g, "\$&");
const PATH_RE = new RegExp(
  `(?<![\w/.])((?:${SITE_PATH_PREFIXES.map(escape).join("|")})(?:/[A-Za-z0-9-]+)*)`,
  "g",
);

/**
 * Chat bubble text with our own page paths (/cars/model-h, /book/test-drive, ...) turned into links.
 * Only paths under the site sections the assistant is allowed to mention are linked; the server guard has already
 * rejected anything else, so there is no way for model text to become an arbitrary or external link here.
 */
export function ChatText({ text }: { text: string }) {
  const parts = text.split(PATH_RE);
  return (
    <>
      {parts.map((part, i) =>
        i % 2 === 1 ? (
          <Link key={i} href={part} className="mx-0.5 inline-flex items-center rounded-pill border border-accent/20 bg-accent-soft px-2 py-0.5 align-baseline text-[11px] font-bold text-accent-ink transition-colors [@media(hover:hover)_and_(pointer:fine)]:hover:bg-accent/20">
            {part}
          </Link>
        ) : (
          <React.Fragment key={i}>{part}</React.Fragment>
        ),
      )}
    </>
  );
}
