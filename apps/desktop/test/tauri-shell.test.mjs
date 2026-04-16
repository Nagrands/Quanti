import assert from "node:assert/strict";
import test from "node:test";
import { readFile } from "node:fs/promises";

const requiredFiles = [
  "../src/tauri-shell.ts",
  "../src-tauri/Cargo.toml",
  "../src-tauri/build.rs",
  "../src-tauri/tauri.conf.json",
  "../src-tauri/src/lib.rs",
  "../src-tauri/src/main.rs",
  "../src-tauri/src/shell_commands.rs",
  "../src-tauri/capabilities/default.json"
];

test("desktop shell foundation files exist", async () => {
  for (const file of requiredFiles) {
    const contents = await readFile(new URL(file, import.meta.url), "utf8");
    assert.ok(contents.length > 0, `${file} should not be empty`);
  }
});

test("desktop shell exports safe native commands and Tauri config", async () => {
  const shellSource = await readFile(new URL("../src/tauri-shell.ts", import.meta.url), "utf8");
  const tauriConfig = await readFile(new URL("../src-tauri/tauri.conf.json", import.meta.url), "utf8");
  const rustCommands = await readFile(new URL("../src-tauri/src/shell_commands.rs", import.meta.url), "utf8");

  assert.match(shellSource, /"get_shell_info"/);
  assert.match(shellSource, /"read_import_preview"/);
  assert.match(shellSource, /"write_export_file"/);
  assert.match(tauriConfig, /"identifier": "com\.quanti\.desktop"/);
  assert.match(rustCommands, /const ALLOWED_EXPORT_EXTENSIONS/);
  assert.match(rustCommands, /MAX_IMPORT_BYTES/);
});
