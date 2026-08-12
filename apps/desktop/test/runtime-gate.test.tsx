import { screen, waitFor } from "@testing-library/react";
import { describe, expect, test, vi } from "vitest";

import { RuntimeGate } from "../src/app/RuntimeGate";
import { getRuntimeInfo } from "../src/tauri-shell";
import { renderWithAppProviders } from "./render-app";

vi.mock("../src/features/transfer/DataTransferControls", () => ({
  DataTransferControls: () => <div>Transfer controls</div>
}));

vi.mock("../src/tauri-shell", () => ({
  chooseAndRestoreBackup: vi.fn(),
  getRuntimeInfo: vi.fn(),
  readRuntimeLog: vi.fn(),
  restoreLatestBackup: vi.fn(),
  retryRuntime: vi.fn()
}));

const mockedGetRuntimeInfo = vi.mocked(getRuntimeInfo);

describe("RuntimeGate branding", () => {
  test("shows the decorative brand while the local runtime is loading", () => {
    mockedGetRuntimeInfo.mockReturnValue(new Promise(() => undefined));
    const { container } = renderWithAppProviders(<RuntimeGate><div>Application</div></RuntimeGate>);

    expect(screen.getByRole("heading", { level: 1, name: "Quanti" })).toBeInTheDocument();
    expect(container.querySelector(".runtime-screen__brand")).toHaveAttribute("aria-hidden", "true");
  });

  test("keeps the brand above startup errors", async () => {
    mockedGetRuntimeInfo.mockRejectedValue(new Error("Runtime unavailable"));
    const { container } = renderWithAppProviders(<RuntimeGate><div>Application</div></RuntimeGate>);

    expect(await screen.findByRole("heading", { level: 1, name: "Не удалось запустить Quanti" })).toBeInTheDocument();
    expect(container.querySelector(".runtime-screen__brand")).toHaveAttribute("aria-hidden", "true");
  });

  test("keeps the brand above first-run migration", async () => {
    mockedGetRuntimeInfo.mockResolvedValue({ firstRun: true } as Awaited<ReturnType<typeof getRuntimeInfo>>);
    const { container } = renderWithAppProviders(<RuntimeGate><div>Application</div></RuntimeGate>);

    await waitFor(() => expect(screen.getByRole("heading", { level: 1, name: "Перенос данных в локальную Quanti" })).toBeInTheDocument());
    expect(container.querySelector(".runtime-screen__brand")).toHaveAttribute("aria-hidden", "true");
  });
});
