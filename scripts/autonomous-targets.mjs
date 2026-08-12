export function pkgTarget(triple) {
  if (triple === "aarch64-apple-darwin") return "node22-macos-arm64";
  if (triple === "x86_64-apple-darwin") return "node22-macos-x64";
  if (triple === "x86_64-pc-windows-msvc") return "node22-win-x64";
  throw new Error(`Unsupported autonomous desktop target: ${triple}.`);
}

export function chromiumPlatform(triple) {
  if (triple === "aarch64-apple-darwin") return "mac_arm";
  if (triple === "x86_64-apple-darwin") return "mac";
  if (triple === "x86_64-pc-windows-msvc") return "win64";
  throw new Error(`Unsupported Chromium target: ${triple}.`);
}
