/**
 * Regression guard: trade-in submissions failed because the code wrote fuel/transmission columns that the
 * trade_in_requests table does not have. database.types.ts is generated from the real schema; everything the
 * app writes must exist there, and the hand-written types must agree with it.
 */
import { describe, it, expect } from "vitest";
import fs from "node:fs";
import path from "node:path";

const read = (rel: string) => fs.readFileSync(path.join(process.cwd(), rel), "utf8");

/** Keys of `<table>: { Row: {...} Insert: {...} }` inside a types file, for the given block ("Row" | "Insert"). */
function tableKeys(source: string, table: string, block: "Row" | "Insert"): string[] {
  const start = source.indexOf(`      ${table}: {`);
  expect(start, `${table} not found`).toBeGreaterThan(-1);
  const from = source.indexOf(`${block}:`, start);
  const open = source.indexOf("{", from);
  let depth = 0;
  let end = open;
  for (let i = open; i < source.length; i++) {
    if (source[i] === "{") depth++;
    if (source[i] === "}" && --depth === 0) {
      end = i;
      break;
    }
  }
  const body = source.slice(open + 1, end);
  return [...body.matchAll(/^\s*([a-z_]+)\??\s*:/gm)].map((m) => m[1]).sort();
}

describe("trade_in_requests columns", () => {
  const generated = read("src/types/database.types.ts");

  it("the submit action only writes columns that exist", () => {
    const real = new Set(tableKeys(generated, "trade_in_requests", "Insert"));
    const action = read("src/server/actions/trade-in.ts");
    const insert = action.slice(action.indexOf('.from("trade_in_requests")'));
    const block = insert.slice(insert.indexOf(".insert({") + 9, insert.indexOf("})"));
    const written = [...block.matchAll(/^\s*([a-z_]+):/gm)].map((m) => m[1]);

    expect(written.length).toBeGreaterThan(5);
    for (const key of written) expect(real.has(key), `column "${key}" does not exist on trade_in_requests`).toBe(true);
  });

  it("the unused repository helper writes only real columns too", () => {
    const real = new Set(tableKeys(generated, "trade_in_requests", "Insert"));
    const repo = read("src/server/repositories/trade-in.ts");
    const block = repo.slice(repo.indexOf("const insertPayload = {") + 23, repo.indexOf("};", repo.indexOf("const insertPayload")));
    for (const m of block.matchAll(/^\s*([a-z_]+):/gm)) {
      expect(real.has(m[1]), `column "${m[1]}" does not exist`).toBe(true);
    }
  });

  it("hand-written types match the real table", () => {
    expect(tableKeys(read("src/types/db.ts"), "trade_in_requests", "Row")).toEqual(
      tableKeys(generated, "trade_in_requests", "Row")
    );
  });

  it("the server schema no longer invents fuel or transmission", () => {
    const schema = read("src/lib/validation/trade-in.ts");
    const submission = schema.slice(schema.indexOf("export const tradeInSubmissionSchema"));
    expect(submission).not.toMatch(/^\s*fuel:/m);
    expect(submission).not.toMatch(/^\s*transmission:/m);
  });
});
