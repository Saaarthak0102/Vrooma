import { describe, expect, it } from "vitest";
import fs from "node:fs";
import path from "node:path";

/**
 * Keeps the trimmed documentation set honest: every markdown file named in the docs, scripts, tests and source
 * comments must exist, and the files merged away during the docs overhaul must not be referenced again.
 */
const ROOT = path.resolve(__dirname, "..");

const REMOVED = [
  "context.md", "master_prompt.md", "FINAL_BLOCKER_VERIFICATION.md", "FINAL_INDEPENDENT_DATABASE_AUDIT.md",
  "PHASE2_DEV_USERS_SEED_REPORT.md", "PHASE2_DEV_VERIFICATION_REPORT.md", "PHASE2_FINAL_FIX_REPORT.md",
  "BRIEF.md", "GATING.md", "ROADMAP.md", "DESIGN_SYSTEM.md", "MOTION.md", "LANDING.md", "LAYOUT_FIXES.md",
  "LISTING_CARDS.md", "LISTING_CARDS_V2.md", "DASHBOARD.md", "BUTTON_SYSTEM.md", "PERFORMANCE.md", "SEO.md",
  "ASSETS.md", "STATUS.md", "AUDIT.md", "BUILD_INVENTORY.md", "VERIFY_REPORT.md", "CRON_SETUP.md", "EXPORT.md",
  "PROD_PROMOTION.md", "SIGNUP_LINK.md", "08-manual-verification.md", "09-audit-flags.md", "10-followups.md",
];

function walk(dir: string, out: string[] = []): string[] {
  for (const entry of fs.readdirSync(dir, { withFileTypes: true })) {
    if (["node_modules", ".next", ".git", "supabase"].includes(entry.name)) continue;
    const full = path.join(dir, entry.name);
    if (entry.isDirectory()) walk(full, out);
    else if (/\.(md|ts|tsx|mjs|yml|example)$/.test(entry.name) || entry.name === ".env.example") out.push(full);
  }
  return out;
}

const files = walk(ROOT).filter((f) => !f.endsWith("docs-links.test.ts"));
const MD_REF = /(?:docs\/(?:backend\/)?)?[A-Za-z0-9_-]+\.md\b/g;

function referencedDocs(): Array<{ file: string; ref: string }> {
  const found: Array<{ file: string; ref: string }> = [];
  for (const file of files) {
    const text = fs.readFileSync(file, "utf8");
    for (const match of text.matchAll(MD_REF)) {
      const ref = match[0];
      // Skip things that are clearly not our docs (package READMEs, template examples).
      if (/node_modules|@types|\.d\.md/.test(ref)) continue;
      found.push({ file: path.relative(ROOT, file), ref });
    }
  }
  return found;
}

function exists(ref: string): boolean {
  const candidates = ref.startsWith("docs/")
    ? [ref]
    : [ref, `docs/${ref}`, `docs/backend/${ref}`, `src/data/mock/${ref}`];
  return candidates.some((c) => fs.existsSync(path.join(ROOT, c)));
}

describe("documentation links", () => {
  const refs = referencedDocs();

  it("finds references to check", () => {
    expect(refs.length).toBeGreaterThan(20);
  });

  it("every referenced markdown file exists", () => {
    const missing = refs.filter((r) => !exists(r.ref)).map((r) => `${r.file} -> ${r.ref}`);
    expect([...new Set(missing)]).toEqual([]);
  });

  it("no reference points at a document that was merged away", () => {
    const stale = refs
      .filter((r) => REMOVED.includes(path.basename(r.ref)))
      .map((r) => `${r.file} -> ${r.ref}`);
    expect([...new Set(stale)]).toEqual([]);
  });

  it("the expected documentation set is present", () => {
    for (const f of [
      "CLAUDE.md", "AGENTS.md", "README.md", "docs/DECISIONS.md", "docs/AI.md", "docs/ARCHITECTURE.md",
      "docs/DATA_MODEL.md", "docs/ROUTES.md", "docs/FRONTEND.md", "docs/DPDP.md", "docs/TESTING.md",
      "docs/WIRING.md", "docs/backend/ENVIRONMENTS.md", "docs/backend/OPERATIONS.md", "docs/backend/PROD_DEMO.md",
      "docs/backend/SECURITY.md", "docs/backend/ROLE_MATRIX.md", "docs/backend/RPC_CALL_PATHS.md",
      "docs/backend/DISCOUNT_RULES.md", "docs/backend/RELEASE.md",
    ]) {
      expect(fs.existsSync(path.join(ROOT, f)), f).toBe(true);
    }
  });
});
