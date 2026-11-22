import { cp, mkdir } from "node:fs/promises";

const files = ["index.html", "style.css", "app.js", "manifest.webmanifest"];
await mkdir("www", { recursive: true });
for (const file of files) {
  await cp(file, `www/${file}`);
}
console.log("Prepared local web assets. The Android shell loads the production site to preserve same-origin secure sessions.");

await mkdir("www/assets", { recursive: true });
await cp("assets/humanoid-icon.svg", "www/assets/humanoid-icon.svg");
