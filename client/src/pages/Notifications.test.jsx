import { cleanup, render, screen, waitFor } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { MemoryRouter, Route, Routes, useLocation } from "react-router-dom";
import { NotificationBell } from "../components/notifications/NotificationBell.jsx";
import { AuthContext } from "../context/auth-context.js";
import { ToastContext } from "../context/toast-context.js";
import { NotificationsPage } from "./NotificationsPage.jsx";

const mocks = vi.hoisted(() => ({
  list: vi.fn(),
  unreadCount: vi.fn(),
  markRead: vi.fn(),
  markAllRead: vi.fn(),
}));
vi.mock("../services/api.js", () => ({
  notificationApi: mocks,
  apiError: (error) => ({ message: error?.message || "Request failed" }),
}));

const ID = "aaaaaaaaaaaaaaaaaaaaaaaa";
const PROJECT = "bbbbbbbbbbbbbbbbbbbbbbbb";
const notification = {
  id: ID,
  type: "JOIN_REQUEST_ACCEPTED",
  title: "Join request accepted",
  message: "Your project join request was accepted.",
  isRead: false,
  readAt: null,
  createdAt: new Date().toISOString(),
  destination: `/projects/${PROJECT}`,
};
const listResponse = (items, pagination = {}) =>
  Promise.resolve({
    data: {
      data: { notifications: items },
      meta: { pagination: { nextCursor: null, hasMore: false, ...pagination } },
    },
  });

function Location() {
  return <span data-testid="location">{useLocation().pathname}</span>;
}

function showPage() {
  return render(
    <MemoryRouter initialEntries={["/dashboard/notifications"]}>
      <AuthContext.Provider
        value={{
          loading: false,
          isAuthenticated: true,
          user: { profile: { displayName: "Notification Tester" } },
          logout: vi.fn(),
        }}
      >
        <ToastContext.Provider value={{ notify: vi.fn() }}>
          <Routes>
            <Route
              path="*"
              element={
                <>
                  <NotificationsPage />
                  <Location />
                </>
              }
            />
          </Routes>
        </ToastContext.Provider>
      </AuthContext.Provider>
    </MemoryRouter>,
  );
}

beforeEach(() => {
  mocks.list.mockImplementation(() => listResponse([notification]));
  mocks.unreadCount.mockResolvedValue({ data: { data: { unreadCount: 3 } } });
  mocks.markRead.mockResolvedValue({
    data: { data: { notification: { ...notification, isRead: true } } },
  });
  mocks.markAllRead.mockResolvedValue({
    data: {
      data: {
        readState: { updatedCount: 1, readAt: new Date().toISOString() },
      },
    },
  });
});
afterEach(() => {
  cleanup();
  vi.clearAllMocks();
});

describe("notifications", () => {
  it("shows the persisted unread badge", async () => {
    render(
      <MemoryRouter>
        <NotificationBell />
      </MemoryRouter>,
    );
    expect(
      await screen.findByLabelText("Notifications, 3 unread"),
    ).toBeInTheDocument();
    expect(screen.getByText("3")).toBeInTheDocument();
  });

  it("renders unread activity and marks it read before trusted navigation", async () => {
    const user = userEvent.setup();
    showPage();
    expect(
      await screen.findByText("Join request accepted"),
    ).toBeInTheDocument();
    expect(screen.getByText("1 unread in this list")).toBeInTheDocument();
    await user.click(screen.getByText("Join request accepted"));
    await waitFor(() => expect(mocks.markRead).toHaveBeenCalledWith(ID));
    await waitFor(() =>
      expect(screen.getByTestId("location")).toHaveTextContent(
        `/projects/${PROJECT}`,
      ),
    );
  });

  it("marks all loaded notifications read without refetching the list", async () => {
    const user = userEvent.setup();
    showPage();
    await user.click(
      await screen.findByRole("button", { name: "Mark all as read" }),
    );
    await waitFor(() => expect(mocks.markAllRead).toHaveBeenCalledTimes(1));
    expect(screen.getByText("You're all caught up.")).toBeInTheDocument();
    expect(mocks.list).toHaveBeenCalledTimes(1);
  });

  it("supports empty and user-friendly error states", async () => {
    mocks.list.mockImplementationOnce(() => listResponse([]));
    const first = showPage();
    expect(await screen.findByText("You're all caught up")).toBeInTheDocument();
    first.unmount();
    mocks.list.mockRejectedValueOnce(
      new Error("Notifications are unavailable"),
    );
    showPage();
    expect(await screen.findByRole("alert")).toHaveTextContent(
      "Notifications are unavailable",
    );
    expect(
      screen.getByRole("button", { name: "Try again" }),
    ).toBeInTheDocument();
  });

  it("renders long or HTML-like notification content as plain text", async () => {
    const unsafe = Array(8).fill("<img src=x onerror=alert(1)>").join(" ");
    mocks.list.mockImplementationOnce(() =>
      listResponse([{ ...notification, message: unsafe, isRead: true }]),
    );
    const { container } = showPage();
    expect(await screen.findByText(unsafe)).toBeInTheDocument();
    expect(container.querySelector('img[src="x"]')).toBeNull();
  });
});
