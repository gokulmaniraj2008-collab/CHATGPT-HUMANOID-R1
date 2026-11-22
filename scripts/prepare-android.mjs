import { cp, mkdir, readFile, readdir, writeFile } from "node:fs/promises";

const manifestPath = "android/app/src/main/AndroidManifest.xml";
let manifest = await readFile(manifestPath, "utf8");
const permissions = [
  "android.permission.CAMERA",
  "android.permission.RECORD_AUDIO",
  "android.permission.MODIFY_AUDIO_SETTINGS"
];
const optionalFeatures = [
  "android.hardware.camera",
  "android.hardware.microphone"
];
const declarations = [
  ...permissions.map((name) => `<uses-permission android:name="${name}" />`),
  ...optionalFeatures.map((name) => `<uses-feature android:name="${name}" android:required="false" />`)
];
const rootEnd = manifest.indexOf(">");
if (rootEnd < 0) throw new Error("AndroidManifest.xml has no manifest root element.");
const missing = declarations.filter((tag) => !manifest.includes(tag));
if (missing.length) {
  manifest = manifest.slice(0, rootEnd + 1) + "\n    " + missing.join("\n    ") + manifest.slice(rootEnd + 1);
}
if (!manifest.includes('android:icon="@mipmap/ic_launcher"')) {
  manifest = manifest.replace(/<application(?=[ >])/, '<application android:icon="@mipmap/ic_launcher"');
}
if (!manifest.includes('android:roundIcon="@mipmap/ic_launcher_round"')) {
  manifest = manifest.replace(/<application(?=[ >])/, '<application android:roundIcon="@mipmap/ic_launcher_round"');
}
await writeFile(manifestPath, manifest);

const sourceDir = "android-res";
const targetDir = "android/app/src/main/res";
await mkdir(targetDir, { recursive: true });
for (const entry of await readdir(sourceDir, { withFileTypes: true })) {
  await cp(`${sourceDir}/${entry.name}`, `${targetDir}/${entry.name}`, { recursive: true, force: true });
}
console.log("Applied HUMANOID R1 launcher icons and Android camera/microphone permissions. Capacitor requests them only when WebView media is used.");
