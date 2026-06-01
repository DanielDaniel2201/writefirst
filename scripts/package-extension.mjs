import { cp, mkdir, rm } from "node:fs/promises";
import { dirname, join } from "node:path";
import { fileURLToPath } from "node:url";
import { execFile } from "node:child_process";
import { promisify } from "node:util";

const execFileAsync = promisify(execFile);

const root = dirname(fileURLToPath(new URL("../package.json", import.meta.url)));
const sourceDist = join(root, "dist");
const downloadsDir = join(root, "apps", "web", "public", "downloads");
const stagingDir = join(downloadsDir, "write-first-extension");
const zipPath = join(downloadsDir, "write-first-extension.zip");

await mkdir(downloadsDir, { recursive: true });
await rm(stagingDir, { recursive: true, force: true });
await rm(zipPath, { force: true });
await cp(sourceDist, stagingDir, { recursive: true });

await execFileAsync("powershell", [
  "-NoProfile",
  "-Command",
  "Compress-Archive -LiteralPath 'write-first-extension' -DestinationPath 'write-first-extension.zip' -Force"
], {
  cwd: downloadsDir
});

await rm(stagingDir, { recursive: true, force: true });

console.log(`Packaged ${zipPath}`);
