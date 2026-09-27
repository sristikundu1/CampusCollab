import { render, screen } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { describe, expect, it } from "vitest";
import { FormField } from "./FormField.jsx";

describe("password visibility", () => {
  it("shows and hides a password without changing its value", async () => {
    const user = userEvent.setup();
    render(<FormField label="Password" name="password" type="password" />);

    const input = screen.getByLabelText("Password");
    await user.type(input, "Secret1");
    expect(input).toHaveAttribute("type", "password");

    await user.click(screen.getByRole("button", { name: "Show password" }));
    expect(input).toHaveAttribute("type", "text");
    expect(input).toHaveValue("Secret1");

    await user.click(screen.getByRole("button", { name: "Hide password" }));
    expect(input).toHaveAttribute("type", "password");
  });
});
