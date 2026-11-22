import { cp, mkdir, readFile, writeFile } from "node:fs/promises";

const manifestPath = "android/app/src/main/AndroidManifest.xml";
let manifest = await readFile(manifestPath, "utf8");
const permissions = [
  "android.permission.CAMERA",
  "android.permission.RECORD_AUDIO",
  "android.permission.MODIFY_AUDIO_SETTINGS"
];
for (const permission of permissions) {
  const tag = `<uses-permission android:name="${permission}" />`;
  if (!manifest.includes(tag)) manifest = manifest.replace(/(<manifest\\b[^>]*>)/, `$1\\n    ${tag}`);
}
for (const feature of ["android.hardware.camera", "android.hardware.microphone"]) {
  const tag = `<uses-feature android:name="${feature}" android:required="false" />`;
  if (!manifest.includes(tag)) manifest = manifest.replace(/(<manifest\\b[^>]*>)/, `$1\\n    ${tag}`);
}
manifest = manifest.replace(/<application\\b([^>]*)>/, (match, attrs) => {
  let next = attrs;
  if (!/android:icon=/.test(next)) next += ' android:icon="@mipmap/ic_launcher"';
  if (!/android:roundIcon=/.test(next)) next += ' android:roundIcon="@mipmap/ic_launcher_round"';
  return `<application${next}>`;
});
await writeFile(manifestPath, manifest);
await cp("android-res", "android/app/src/main/res", { recursive: true, force: true });
console.log("Applied HUMANOID R1 launcher icons and just-in-time camera/microphone Android permissions.");
