import { cleanup, render, screen, waitFor } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { MemoryRouter } from "react-router-dom";
import { VerifyEmailPage } from "./VerifyEmailPage.jsx";

const mocks = vi.hoisted(() => ({
  verify: vi.fn(),
  resend: vi.fn(),
}));

vi.mock("../services/api.js", () => ({
  authApi: { verify: mocks.verify, resend: mocks.resend },
  apiError: (error) => ({ message: error?.message || "Request failed" }),
}));

function response(data) {
  return Promise.resolve({ data: { data } });
}

function renderPage() {
  return render(
    <MemoryRouter
      initialEntries={[
        {
          pathname: "/verify-email",
          state: {
            email: "student@example.edu",
            message: "Enter the code from your inbox.",
            expiresInSeconds: 600,
          },
        },
      ]}
    >
      <VerifyEmailPage />
    </MemoryRouter>,
  );
}

beforeEach(() => {
  mocks.verify.mockImplementation(() =>
    response({ message: "Your university email has been verified." }),
  );
  mocks.resend.mockImplementation(() =>
    response({
      message: "A new verification code has been sent.",
      expiresInSeconds: 600,
    }),
  );
});

afterEach(() => {
  cleanup();
  vi.clearAllMocks();
});

describe("university email verification", () => {
  it("submits the account email with a six-digit code", async () => {
    const user = userEvent.setup();
    renderPage();

    await user.type(screen.getByLabelText("Verification code"), "12ab3456");
    await user.click(screen.getByRole("button", { name: "Verify email" }));

    await waitFor(() =>
      expect(mocks.verify).toHaveBeenCalledWith(
        "student@example.edu",
        "123456",
      ),
    );
    expect(
      await screen.findByText("Your university email has been verified."),
    ).toBeInTheDocument();
    expect(
      screen.getByRole("link", { name: "Continue to sign in" }),
    ).toHaveAttribute("href", "/login");
  });

  it("requests a replacement code for the entered email", async () => {
    const user = userEvent.setup();
    renderPage();

    await user.click(screen.getByRole("button", { name: "Resend code" }));

    await waitFor(() =>
      expect(mocks.resend).toHaveBeenCalledWith("student@example.edu"),
    );
    expect(
      await screen.findByText("A new verification code has been sent."),
    ).toBeInTheDocument();
  });
});
