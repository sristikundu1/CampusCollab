import { cleanup, render, screen, waitFor } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { afterEach, describe, expect, it, vi } from "vitest";
import { MemoryRouter, Route, Routes } from "react-router-dom";
import { AuthContext } from "../../context/auth-context.js";
import { ToastContext } from "../../context/toast-context.js";
import { SiteHeader } from "./SiteHeader.jsx";

afterEach(cleanup);

function renderHeader(auth) {
  return render(
    <MemoryRouter initialEntries={["/"]}>
      <AuthContext.Provider value={auth}>
        <ToastContext.Provider value={{ notify: vi.fn() }}>
          <SiteHeader />
          <Routes>
            <Route path="/" element={<div>Home</div>} />
            <Route path="/dashboard" element={<div>Dashboard page</div>} />
          </Routes>
        </ToastContext.Provider>
      </AuthContext.Provider>
    </MemoryRouter>,
  );
}

describe("authentication-aware site navigation", () => {
  it("shows one Get Started action and no login button when signed out", () => {
    renderHeader({ loading: false, isAuthenticated: false, user: null });
    expect(screen.getByRole("link", { name: "Get Started" })).toHaveAttribute(
      "href",
      "/login",
    );
    expect(
      screen.queryByRole("link", { name: /log in|sign in/i }),
    ).not.toBeInTheDocument();
  });

  it("uses the profile fallback menu and existing logout mechanism", async () => {
    const user = userEvent.setup();
    const logout = vi.fn().mockResolvedValue(undefined);
    renderHeader({
      loading: false,
      isAuthenticated: true,
      logout,
      user: {
        email: "john.doe@bscse.uiu.ac.bd",
        profile: { displayName: "John Doe" },
      },
    });
    expect(
      screen.queryByRole("link", { name: "Get Started" }),
    ).not.toBeInTheDocument();
    expect(screen.getByText("J")).toBeInTheDocument();
    await user.click(
      screen.getByRole("button", { name: /open account menu/i }),
    );
    expect(screen.getByRole("menuitem", { name: "Dashboard" })).toHaveAttribute(
      "href",
      "/dashboard",
    );
    expect(screen.getByRole("menuitem", { name: "Profile" })).toHaveAttribute(
      "href",
      "/dashboard/profile",
    );
    await user.click(screen.getByRole("menuitem", { name: "Logout" }));
    await waitFor(() => expect(logout).toHaveBeenCalledOnce());
    expect(screen.getByText("Home")).toBeInTheDocument();
  });
});
