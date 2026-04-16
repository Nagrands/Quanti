import { createDesktopApp, getSupportedDesktopShellCommands } from "./tauri-shell";

export { createDesktopApp, getSupportedDesktopShellCommands } from "./tauri-shell";

console.log(createDesktopApp(), getSupportedDesktopShellCommands().join(","));
