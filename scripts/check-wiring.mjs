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

console.log("==================================================");
console.log("            VROOMA DEAD-BUTTON AUDIT              ");
console.log("==================================================");

if (matches.length === 0) {
  console.log("✅ 0 unwired buttons found! All actions wired.");
  process.exit(0);
} else {
  console.log(`Found ${matches.length} placeholder action(s) using notWired():\n`);
  console.log("| File | Action Label | Target Day |");
  console.log("|------|--------------|------------|");
  for (const m of matches) {
    console.log(`| ${m.file} | ${m.label} | Day ${m.day} |`);
  }
  console.log("\nRegistered in docs/WIRING.md");
  if (isStrict) {
    console.error("\n❌ Strict mode enabled: Unwired buttons remain. Exiting with 1.");
    process.exit(1);
  } else {
    console.log("\nℹ️ Normal mode: Informational count only. Exiting with 0.");
    process.exit(0);
  }
}

