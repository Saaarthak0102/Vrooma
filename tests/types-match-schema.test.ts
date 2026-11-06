/**
 * The Supabase clients are typed from the HAND-WRITTEN src/types/db.ts, while src/types/database.types.ts is
 * GENERATED from the real schema. Where they disagree, TypeScript lets code write columns that do not exist
 * (that is how trade-in submissions and offer saving broke). This test lists every table whose Row columns
 * differ, so drift is caught here instead of in production.
 */
import { describe, it, expect } from "vitest";
import fs from "node:fs";
import path from "node:path";

const read = (rel: string) => fs.readFileSync(path.join(process.cwd(), rel), "utf8");

/** table -> sorted Row column names, from `      table: {\n        Row: {` blocks. */
function rowColumns(source: string): Record<string, string[]> {
  const out: Record<string, string[]> = {};
  const re = /^      ([a-z_]+): \{\s*\n\s*Row: \{/gm;
  let m: RegExpExecArray | null;
  while ((m = re.exec(source))) {
    const open = source.indexOf("{", m.index + m[0].length - 1);
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
    out[m[1]] = [...body.matchAll(/^\s*([a-z_0-9]+)\??\s*:/gm)].map((x) => x[1]).sort();
  }
  return out;
}

/**
 * Columns the GENERATED file is missing only because it was generated before the migration that added them.
 * Each entry is verified against the migration text below, so this list cannot hide a real drift.
 */
const ADDED_AFTER_GENERATION: Record<string, { columns: string[]; migration: string }> = {
  messages_outbox: { columns: ["sent_at", "updated_at"], migration: "supabase/migrations/0018_create_lead_actor_and_cron_jobs.sql" },
};

describe("hand-written db types vs the generated schema", () => {
  const generated = rowColumns(read("src/types/database.types.ts"));
  const handWritten = rowColumns(read("src/types/db.ts"));

  it("parses both files", () => {
    expect(Object.keys(generated).length).toBeGreaterThan(20);
    expect(Object.keys(handWritten).length).toBeGreaterThan(20);
  });

  it("the allow-listed columns really were added by their migration", () => {
    for (const [table, { columns, migration }] of Object.entries(ADDED_AFTER_GENERATION)) {
      const sql = read(migration);
      for (const column of columns) expect(sql, `${table}.${column} not in ${migration}`).toMatch(new RegExp(column));
    }
  });

  it("every table has exactly the same columns in both", () => {
    const drift: string[] = [];
    for (const [table, columns] of Object.entries(handWritten)) {
      const real = generated[table];
      if (!real) continue; // a view or a table only the hand-written file knows about
      const known = ADDED_AFTER_GENERATION[table]?.columns ?? [];
      const extra = columns.filter((c) => !real.includes(c) && !known.includes(c));
      const missing = real.filter((c) => !columns.includes(c));
      if (extra.length || missing.length) {
        drift.push(`${table}: db.ts has extra [${extra.join(", ")}], is missing [${missing.join(", ")}]`);
      }
    }
    expect(drift, `Type drift:\n${drift.join("\n")}`).toEqual([]);
  });
});
