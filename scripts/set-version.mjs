import { readFile, writeFile } from "node:fs/promises";
import path from "node:path";
import { fileURLToPath } from "node:url";

const version = process.argv[2];
if (!version || !/^\d+\.\d+\.\d+$/.test(version))
  throw new Error("Use a stable version, for example: node scripts/set-version.mjs 0.1.1");
const root = path.dirname(path.dirname(fileURLToPath(import.meta.url)));
for (const file of [
  "package.json",
  "apps/web/package.json",
  "apps/desktop/package.json",
  "apps/mobile/package.json",
]) {
  const target = path.join(root, file);
  const json = JSON.parse(await readFile(target, "utf8"));
  json.version = version;
  await writeFile(target, `${JSON.stringify(json, null, 2)}\n`);
}
const appPath = path.join(root, "apps/mobile/app.json");
const mobile = JSON.parse(await readFile(appPath, "utf8"));
mobile.expo.version = version;
await writeFile(appPath, `${JSON.stringify(mobile, null, 2)}\n`);
const uiPath = path.join(root, "apps/web/src/components/library-app.tsx");
const source = await readFile(uiPath, "utf8");
await writeFile(uiPath, source.replace(/MUSE \d+\.\d+(?:\.\d+)? <span>/, `MUSE ${version} <span>`));
console.log(`MUSE version set to ${version}.`);
