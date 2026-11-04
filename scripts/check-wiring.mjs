import fs from "node:fs";
import path from "node:path";

const isStrict = process.argv.includes("--strict");
const srcDir = path.resolve(process.cwd(), "src");
const repoDir = path.resolve(process.cwd(), "src/server/repositories");

function walkDir(dir, fileList = []) {
  if (!fs.existsSync(dir)) return fileList;
  const files = fs.readdirSync(dir);
  for (const file of files) {
    const fullPath = path.join(dir, file);
    const stat = fs.statSync(fullPath);
    if (stat.isDirectory()) {
      walkDir(fullPath, fileList);
    } else if (/\.(tsx|ts|jsx|js)$/.test(file)) {
      fileList.push(fullPath);
    }
  }
  return fileList;
}

const files = walkDir(srcDir);
const matches = [];

const regex = /notWired\(\s*(["'`])(.*?)\1\s*(?:,\s*(\d+))?\s*\)/g;

for (const file of files) {
  const content = fs.readFileSync(file, "utf-8");
  let match;
  while ((match = regex.exec(content)) !== null) {
    const relPath = path.relative(process.cwd(), file).replace(/\\/g, "/");
    matches.push({
      file: relPath,
      label: match[2],
      day: match[3] || "3",
    });
  }
}

// Check repository TODO(day- matches
const repoFiles = walkDir(repoDir);
const repoTodoMatches = [];
const repoTodoRegex = /TODO\(day-(\d+)\):?\s*([^\n"]*)/g;

for (const file of repoFiles) {
  const content = fs.readFileSync(file, "utf-8");
  let match;
  while ((match = repoTodoRegex.exec(content)) !== null) {
    const relPath = path.relative(process.cwd(), file).replace(/\\/g, "/");
    repoTodoMatches.push({
      file: relPath,
      day: match[1],
      description: match[2].trim().replace(/["';\)]+$/, ""),
    });
  }
}

console.log("==================================================");
console.log("            VROOMA WIRING & REPOSITORY AUDIT      ");
console.log("==================================================");

let hasFailure = false;

if (matches.length === 0) {
  console.log("✅ 0 unwired buttons found! All UI actions wired.");
} else {
  console.log(`Found ${matches.length} placeholder action(s) using notWired():\n`);
  console.log("| File | Action Label | Target Day |");
  console.log("|------|--------------|------------|");
  for (const m of matches) {
    console.log(`| ${m.file} | ${m.label} | Day ${m.day} |`);
  }
  console.log("\nRegistered in docs/WIRING.md");
  if (isStrict) hasFailure = true;
}

if (repoTodoMatches.length === 0) {
  console.log("\n✅ 0 repository TODO(day- markers found! All repositories implemented.");
} else {
  console.log(`\nFound ${repoTodoMatches.length} pending repository implementation(s) using TODO(day-):\n`);
  console.log("| Repository File | Target Day | Description |");
  console.log("|-----------------|------------|-------------|");
  for (const r of repoTodoMatches) {
    console.log(`| ${r.file} | Day ${r.day} | ${r.description} |`);
  }
  if (isStrict) {
    hasFailure = true;
  }
}

if (isStrict && hasFailure) {
  console.error("\n❌ Strict mode enabled: Unwired buttons or pending repository TODOs remain. Exiting with 1.");
  process.exit(1);
} else {
  console.log("\nℹ️ Normal mode: Informational count only. Exiting with 0.\n");
  process.exit(0);
}
