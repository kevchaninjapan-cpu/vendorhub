import fs from "fs";
import path from "path";

const ROOT = process.cwd();
const SCAN_DIRS = ["src"]; // keep it tight; add others if needed
const BLOCKED = [
  "@profile/",
  "__REL__/",
  "@admin/",
  "@components/",
  "@lib/",
];

function walk(dir, files = []) {
  for (const entry of fs.readdirSync(dir, { withFileTypes: true })) {
    const full = path.join(dir, entry.name);

    if (entry.isDirectory()) {
      if (entry.name === "node_modules" || entry.name === ".next" || entry.name === ".git") continue;
      walk(full, files);
    } else if (entry.isFile()) {
      // Only scan source-like files
      if (/\.(ts|tsx|js|jsx|mjs|cjs)$/.test(entry.name)) files.push(full);
    }
  }
  return files;
}

function scanFile(filePath) {
  const txt = fs.readFileSync(filePath, "utf8");
  for (const token of BLOCKED) {
    if (txt.includes(token)) return token;
  }
  return null;
}

let violations = [];

for (const dir of SCAN_DIRS) {
  const abs = path.join(ROOT, dir);
  if (!fs.existsSync(abs)) continue;

  const files = walk(abs);
  for (const f of files) {
    const hit = scanFile(f);
    if (hit) violations.push({ file: path.relative(ROOT, f), token: hit });
  }
}

if (violations.length) {
  console.error("\n❌ Prebuild guard failed. Blocked import patterns found:\n");
  for (const v of violations) console.error(`- ${v.file}  →  contains "${v.token}"`);
  console.error("\nFix: use only @/… imports (mapped to src/) and remove placeholders like __REL__.\n");
  process.exit(1);
}

console.log("✅ Prebuild guard: OK");
``