import React from "react";

export interface JsonLdProps {
  data: Record<string, unknown>;
}

/** The JSON escape for one character, built from its code so this file holds no raw control characters. */
const jsonEscape = (code: number) => String.fromCharCode(92) + "u" + code.toString(16).padStart(4, "0");

/**
 * JSON-LD goes into a <script> tag as raw text, so a "</script>" inside any value (a car description a staff member
 * typed, say) would end the tag early and let the rest run as markup. Replacing every "<" with its JSON escape keeps
 * the data identical for search engines and makes that impossible. The two Unicode line separators are escaped too:
 * they are valid in JSON but break some script parsers.
 */
export function jsonLdString(data: Record<string, unknown>): string {
  let out = JSON.stringify(data);
  for (const code of [0x3c, 0x2028, 0x2029]) {
    out = out.split(String.fromCharCode(code)).join(jsonEscape(code));
  }
  return out;
}

export function JsonLd({ data }: JsonLdProps) {
  return (
    <script
      type="application/ld+json"
      dangerouslySetInnerHTML={{ __html: jsonLdString(data) }}
    />
  );
}
