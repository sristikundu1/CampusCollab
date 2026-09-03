import { cleanup, fireEvent, render, screen } from "@testing-library/react";
import { afterEach, describe, expect, it } from "vitest";
import { Avatar } from "./Avatar.jsx";

afterEach(cleanup);

describe("Avatar", () => {
  it("uses the email initial before the display name", () => {
    render(<Avatar email="john@example.com" name="Alex Smith" />);
    expect(screen.getByText("J")).toBeInTheDocument();
  });

  it("shows an uploaded image and safely falls back when it cannot load", () => {
    render(
      <Avatar
        src="data:image/png;base64,broken"
        email="sristi@bscse.uiu.ac.bd"
        name="Sristi Kundu"
      />,
    );
    const image = screen.getByRole("presentation");
    expect(image).toBeInTheDocument();
    fireEvent.error(image);
    expect(screen.queryByRole("presentation")).not.toBeInTheDocument();
    expect(screen.getByText("S")).toBeInTheDocument();
  });
});
