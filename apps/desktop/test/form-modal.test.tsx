import { render, screen, waitFor } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { useState } from "react";
import { describe, expect, test, vi } from "vitest";

import { FormModal } from "../src/components/forms/FormModal";

function ModalHarness({ onClosed = () => undefined }: { onClosed?: () => void }) {
  const [open, setOpen] = useState(false);
  return <>
    <button onClick={() => setOpen(true)}>Открыть форму</button>
    {open ? <FormModal ariaLabel="Тестовая форма" onClose={() => { setOpen(false); onClosed(); }}>
      {(requestClose) => <div>
        <button onClick={requestClose}>Закрыть</button>
        <input aria-label="Поле" />
      </div>}
    </FormModal> : null}
  </>;
}

describe("FormModal", () => {
  test("moves focus inside and closes with Escape before restoring focus", async () => {
    const user = userEvent.setup();
    const onClosed = vi.fn();
    render(<ModalHarness onClosed={onClosed} />);
    const opener = screen.getByRole("button", { name: "Открыть форму" });
    await user.click(opener);

    expect(screen.getByRole("button", { name: "Закрыть" })).toHaveFocus();
    await user.keyboard("{Escape}");
    await waitFor(() => expect(screen.queryByRole("dialog", { name: "Тестовая форма" })).not.toBeInTheDocument());
    expect(onClosed).toHaveBeenCalledOnce();
    expect(opener).toHaveFocus();
  });

  test("closes on the backdrop but not on content clicks", async () => {
    const user = userEvent.setup();
    render(<ModalHarness />);
    await user.click(screen.getByRole("button", { name: "Открыть форму" }));
    const dialog = screen.getByRole("dialog", { name: "Тестовая форма" });
    await user.click(screen.getByLabelText("Поле"));
    expect(dialog).toBeInTheDocument();

    const backdrop = dialog.parentElement;
    expect(backdrop).not.toBeNull();
    await user.click(backdrop!);
    await waitFor(() => expect(screen.queryByRole("dialog", { name: "Тестовая форма" })).not.toBeInTheDocument());
  });
});
