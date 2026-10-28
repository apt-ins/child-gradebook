import sharp from "sharp";
import fs from "node:fs/promises";
const svg = Buffer.from(
  '<svg xmlns="http://www.w3.org/2000/svg" width="1024" height="1024" viewBox="0 0 64 64"><rect width="64" height="64" rx="15" fill="#3868f5"/><path d="M15 19c7-3 12-1 17 3 5-4 10-6 17-3v27c-7-3-12-1-17 3-5-4-10-6-17-3V19zm17 3v27" fill="none" stroke="white" stroke-width="3" stroke-linejoin="round"/></svg>',
);
for (const [folder, size] of Object.entries({
  "mipmap-mdpi": 48,
  "mipmap-hdpi": 72,
  "mipmap-xhdpi": 96,
  "mipmap-xxhdpi": 144,
  "mipmap-xxxhdpi": 192,
})) {
  for (const n of [
    "ic_launcher.png",
    "ic_launcher_round.png",
    "ic_launcher_foreground.png",
  ])
    await sharp(svg)
      .resize(size, size)
      .png()
      .toFile(`android/app/src/main/res/${folder}/${n}`);
}
for (const file of [
  "android/app/src/main/res/mipmap-anydpi-v26/ic_launcher.xml",
  "android/app/src/main/res/mipmap-anydpi-v26/ic_launcher_round.xml",
])
  await fs.writeFile(
    file,
    '<?xml version="1.0" encoding="utf-8"?><adaptive-icon xmlns:android="http://schemas.android.com/apk/res/android"><background android:drawable="@color/ic_launcher_background"/><foreground android:drawable="@mipmap/ic_launcher_foreground"/></adaptive-icon>',
  );
