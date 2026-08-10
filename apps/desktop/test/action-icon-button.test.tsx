import { render, screen } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { Pencil } from "lucide-react";
import { describe, expect, test } from "vitest";

import { ActionIconButton } from "../src/components/actions/ActionIconButton";

describe("ActionIconButton", () => {
  test("shows an accessible tooltip for hover and keyboard focus and closes on Escape", async () => {
    const user = userEvent.setup();
    render(<ActionIconButton label="Изменить" icon={<Pencil />} />);
    const button = screen.getByRole("button", { name: "Изменить" });

    await user.hover(button);
    expect(screen.getByRole("tooltip")).toHaveTextContent("Изменить");
    await user.unhover(button);
    expect(screen.queryByRole("tooltip")).not.toBeInTheDocument();

    await user.tab();
    expect(screen.getByRole("tooltip")).toHaveTextContent("Изменить");
    await user.keyboard("{Escape}");
    expect(screen.queryByRole("tooltip")).not.toBeInTheDocument();
  });

  test("exposes loading and disabled state", () => {
    render(<ActionIconButton label="Печать" icon={<Pencil />} loading disabled />);
    expect(screen.getByRole("button", { name: "Печать" })).toHaveAttribute("aria-busy", "true");
    expect(screen.getByRole("button", { name: "Печать" })).toBeDisabled();
  });
});
