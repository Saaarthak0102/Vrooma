import { describe, expect, it } from "vitest";

import { jsonLdString } from "@/components/seo/JsonLd";

describe("JSON-LD script content", () => {
  it("cannot be closed early by text inside a value", () => {
    const out = jsonLdString({ name: "Model H", description: 'Nice car</script><script>alert(1)</script>' });
    expect(out).not.toContain("<");
    expect(out).not.toContain("</script>");
  });

  it("still parses back to exactly the same data", () => {
    const data = { name: "Model <H> & Co", price: 1245000, nested: { note: "a < b > c d e" } };
    expect(JSON.parse(jsonLdString(data))).toEqual(data);
  });

  it("leaves ordinary data unchanged", () => {
    expect(jsonLdString({ a: 1, b: "two" })).toBe('{"a":1,"b":"two"}');
  });
});
