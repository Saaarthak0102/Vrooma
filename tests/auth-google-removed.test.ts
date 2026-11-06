/** Sign-in is email code only: Google OAuth is gone from the code, the routes and the copy. */
import { describe, it, expect } from "vitest";
import fs from "node:fs";
import path from "node:path";

const root = path.resolve(__dirname, "..");

function walk(dir: string, out: string[] = []): string[] {
  for (const e of fs.readdirSync(dir, { withFileTypes: true })) {
    const p = path.join(dir, e.name);
    if (e.isDirectory()) walk(p, out);
    else if (/\.(ts|tsx)$/.test(e.name)) out.push(p);
  }
  return out;
}

describe("Google sign-in removed", () => {
  const files = walk(path.join(root, "src"));

  it("no source file starts a Google / OAuth sign-in", () => {
    for (const f of files) {
      const text = fs.readFileSync(f, "utf8");
      expect(text, f).not.toMatch(/startGoogle|signInWithOAuth|Continue with Google|handleGoogleSignIn/);
    }
  });

  it("the OAuth callback route is gone, the email confirm route stays", () => {
    expect(fs.existsSync(path.join(root, "src/app/auth/callback"))).toBe(false);
    expect(fs.existsSync(path.join(root, "src/app/auth/confirm/route.ts"))).toBe(true);
  });

  it("the English catalogue has no Google label", () => {
    expect(fs.readFileSync(path.join(root, "messages/en.json"), "utf8")).not.toMatch(/google/i);
  });
});
