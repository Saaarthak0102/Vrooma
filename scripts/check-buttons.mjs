import fs from "node:fs";
import path from "node:path";

const isStrict = process.argv.includes("--strict");
const srcDir = path.resolve(process.cwd(), "src");

function walkDir(dir, fileList = []) {
  if (!fs.existsSync(dir)) return fileList;
  const files = fs.readdirSync(dir);
  for (const file of files) {
    const fullPath = path.join(dir, file);
    const stat = fs.statSync(fullPath);
    if (stat.isDirectory()) {
      walkDir(fullPath, fileList);
    } else if (/\.(tsx|jsx|ts|js)$/.test(file)) {
      fileList.push(fullPath);
    }
  }
  return fileList;
}

const files = walkDir(srcDir);

// Allow-list files for raw <button:
// 1. src/components/ui/button.tsx - Button primitive implementation
// 2. Radix close wrappers: dialog.tsx, sheet.tsx
const rawButtonAllowList = new Set([
  "src/components/ui/button.tsx",
  "src/components/ui/dialog.tsx",
  "src/components/ui/sheet.tsx",
]);

// Allow-list for Link/anchor styled links:
// Header nav links, sidebar links, orbit chips
const linkButtonAllowList = new Set([
  "src/components/ui/button.tsx",
  "src/components/layout/SiteHeader.tsx", // Header nav items (links with active/hover pill)
  "src/components/layout/AdminSidebar.tsx", // Nav menu links
  "src/components/layout/StaffSidebar.tsx", // Nav menu links
  "src/components/landing/ShowroomsOrbit.tsx", // Pinned location orbit chips
]);

const rawButtonMatches = [];
const linkButtonMatches = [];

for (const file of files) {
  const rel = path.relative(process.cwd(), file).replace(/\\/g, "/");
  const content = fs.readFileSync(file, "utf-8");

  // Check 1: Raw <button
  if (!rawButtonAllowList.has(rel)) {
    const lines = content.split("\n");
    lines.forEach((line, idx) => {
      if (/<button\b/.test(line)) {
        rawButtonMatches.push({
          file: rel,
          line: idx + 1,
          code: line.trim().slice(0, 80),
          issue: "Raw <button> tag outside allow-list",
        });
      }
    });
  }

  // Check 2: <Link or <a with button-like patterns (rounded-full, bg-dark, bg-accent, etc.)
  if (!linkButtonAllowList.has(rel)) {
    const tagRegex = /<(Link|a)\b([^>]*?)>/gs;
    let match;
    while ((match = tagRegex.exec(content)) !== null) {
      const attrs = match[2];
      const isButtonLike = /(rounded-full|rounded-pill|bg-dark|bg-accent|notch-btn)\b/.test(attrs);
      if (isButtonLike) {
        const lineNum = content.slice(0, match.index).split("\n").length;
        linkButtonMatches.push({
          file: rel,
          line: lineNum,
          code: match[0].replace(/\s+/g, " ").slice(0, 80),
          issue: "Link/anchor with button classes outside allow-list",
        });
      }
    }
  }
}

const allViolations = [...rawButtonMatches, ...linkButtonMatches];

console.log("==================================================");
console.log("       VROOMA BUTTON & LINK AUDIT CHECK           ");
console.log("==================================================");

if (allViolations.length === 0) {
  console.log("✅ 0 unmigrated buttons found! All buttons use Button / Button wrappers.\n");
  console.log("Summary:");
  console.log("- Raw <button> outside allow-list: 0");
  console.log("- Button-like <Link>/<a> outside allow-list: 0");
  process.exit(0);
} else {
  console.log(`❌ Found ${allViolations.length} button violation(s):\n`);
  console.log("| File:Line | Issue | Code Preview |");
  console.log("|-----------|-------|--------------|");
  for (const v of allViolations) {
    console.log(`| ${v.file}:${v.line} | ${v.issue} | \`${v.code}\` |`);
  }

  if (isStrict) {
    console.error("\n❌ Strict mode: Exiting with code 1.");
    process.exit(1);
  } else {
    console.log("\nℹ️ Non-strict mode: Exiting with code 0.");
    process.exit(0);
  }
}
