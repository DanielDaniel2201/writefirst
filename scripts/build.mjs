import { mkdir, readFile, rm, writeFile } from "node:fs/promises";
import { dirname, join } from "node:path";
import { fileURLToPath } from "node:url";
import { build } from "esbuild";

const root = dirname(fileURLToPath(new URL("../package.json", import.meta.url)));
const dist = join(root, "dist");

await rm(dist, { recursive: true, force: true });
await mkdir(dist, { recursive: true });

await build({
  entryPoints: {
    background: join(root, "src/background.ts"),
    content: join(root, "src/content.ts"),
    options: join(root, "src/options.ts")
  },
  bundle: true,
  outdir: dist,
  format: "iife",
  target: ["chrome120"],
  sourcemap: true,
  minify: false,
  logLevel: "info"
});

for (const fileName of ["manifest.json", "options.html", "options.css"]) {
  const source = await readFile(join(root, "src", fileName), "utf8");
  await writeFile(join(dist, fileName), source);
}
