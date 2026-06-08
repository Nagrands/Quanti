import assert from "node:assert/strict";
import test from "node:test";
import { readFile } from "node:fs/promises";

const requiredFiles = [
  "../src/tauri-shell.ts",
  "../src-tauri/Cargo.toml",
  "../src-tauri/build.rs",
  "../src-tauri/tauri.conf.json",
  "../src-tauri/tauri.macos.conf.json",
  "../src-tauri/tauri.windows.conf.json",
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
  const macosConfig = await readFile(new URL("../src-tauri/tauri.macos.conf.json", import.meta.url), "utf8");
  const windowsConfig = await readFile(new URL("../src-tauri/tauri.windows.conf.json", import.meta.url), "utf8");
  const rustLib = await readFile(new URL("../src-tauri/src/lib.rs", import.meta.url), "utf8");
  const rustCommands = await readFile(new URL("../src-tauri/src/shell_commands.rs", import.meta.url), "utf8");

  assert.match(shellSource, /"get_shell_info"/);
  assert.match(shellSource, /"pick_import_file"/);
  assert.match(shellSource, /"read_import_preview"/);
  assert.match(shellSource, /"save_export_file"/);
  assert.match(shellSource, /"save_export_bytes"/);
  assert.match(shellSource, /window\.__TAURI__/);
  assert.match(shellSource, /invoke<string \| null>/);
  assert.match(tauriConfig, /"identifier": "com\.quanti\.desktop"/);
  assert.match(tauriConfig, /"withGlobalTauri": true/);
  assert.match(tauriConfig, /"icons\/icon\.icns"/);
  assert.match(tauriConfig, /"icons\/icon\.ico"/);
  assert.match(macosConfig, /"targets": \["dmg"\]/);
  assert.match(windowsConfig, /"targets": \["msi"\]/);
  assert.match(windowsConfig, /"type": "embedBootstrapper"/);
  assert.match(rustLib, /ImportApprovals::default/);
  assert.match(rustLib, /pick_import_file/);
  assert.match(rustLib, /save_export_file/);
  assert.match(rustCommands, /State<'_, ImportApprovals>/);
  assert.match(rustCommands, /blocking_pick_file/);
  assert.match(rustCommands, /blocking_save_file/);
  assert.match(rustLib, /tauri_plugin_dialog::init/);
  assert.match(rustLib, /save_export_bytes/);
  assert.match(rustCommands, /DialogExt/);
  assert.match(rustCommands, /blocking_save_file/);
  assert.match(rustCommands, /%PDF-/);
  assert.match(rustCommands, /Import approval is missing or expired/);
  assert.match(rustCommands, /validate_export_name/);
  assert.match(rustCommands, /MAX_IMPORT_BYTES/);
});
