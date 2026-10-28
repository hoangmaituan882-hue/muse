import { cp, mkdir, rm, stat } from "node:fs/promises";
import path from "node:path";
import { fileURLToPath } from "node:url";

const root = fileURLToPath(new URL("..", import.meta.url));
const source = path.join(root, "apps/web/dist");
const output = path.resolve(root, "dist");
await stat(path.join(source, "index.html"));
if (path.dirname(output) !== path.resolve(root) || path.basename(output) !== "dist") {
  throw new Error("Site output must be the project's dist directory");
}
await rm(output, { recursive: true, force: true });
await mkdir(output, { recursive: true });
await cp(source, output, { recursive: true });
console.log("Prepared MUSE website in dist/");
