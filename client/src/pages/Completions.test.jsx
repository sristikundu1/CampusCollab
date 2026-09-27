import { cleanup, render, screen, waitFor } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { MemoryRouter } from "react-router-dom";
import { AuthContext } from "../context/auth-context.js";
import { ToastContext } from "../context/toast-context.js";
import { CompletionsPage } from "./CompletionsPage.jsx";

const mocks = vi.hoisted(() => ({
  list: vi.fn(),
  respond: vi.fn(),
  notify: vi.fn(),
  confirm: vi.fn(),
}));
vi.mock("../services/api.js", () => ({
  completionApi: { list: mocks.list, respond: mocks.respond },
  notificationApi: {
    unreadCount: vi
      .fn()
      .mockResolvedValue({ data: { data: { unreadCount: 0 } } }),
  },
  apiError: (error) => ({ message: error?.message || "Request failed" }),
}));
vi.mock("../lib/confirm-action.js", () => ({
  confirmAction: mocks.confirm,
}));

const USER = "aaaaaaaaaaaaaaaaaaaaaaaa";
const OWNER = "bbbbbbbbbbbbbbbbbbbbbbbb";
const RECORD = "cccccccccccccccccccccccc";
const pending = {
  id: RECORD,
  contextType: "PROJECT_MEMBERSHIP",
  contextId: "dddddddddddddddddddddddd",
  resourceId: "eeeeeeeeeeeeeeeeeeeeeeee",
  ownerId: OWNER,
  participantId: USER,
  status: "PENDING_ACKNOWLEDGEMENT",
  requestedAt: "2026-09-20T00:00:00.000Z",
  responseDueAt: "2026-10-04T00:00:00.000Z",
  resource: {
    type: "PROJECT",
    title: "Accessible campus research portal",
    status: "COMPLETION_PENDING",
  },
};

function show(userId = USER) {
  return render(
    <MemoryRouter>
      <AuthContext.Provider
        value={{
          loading: false,
          isAuthenticated: true,
          user: { id: userId, profile: { displayName: "Completion Tester" } },
          logout: vi.fn(),
        }}
      >
        <ToastContext.Provider value={{ notify: mocks.notify }}>
          <CompletionsPage />
        </ToastContext.Provider>
      </AuthContext.Provider>
    </MemoryRouter>,
  );
}

beforeEach(() => {
  mocks.list.mockResolvedValue({
    data: { data: { completionRecords: [pending] } },
  });
  mocks.respond.mockResolvedValue({
    data: {
      data: { completionRecord: { ...pending, status: "COMPLETED" } },
    },
  });
  mocks.confirm.mockResolvedValue(true);
});

afterEach(() => {
  cleanup();
  vi.clearAllMocks();
});

describe("completion workflow", () => {
  it("shows pending participant work with confirmation and dispute actions", async () => {
    show();
    expect(
      await screen.findByText("Accessible campus research portal"),
    ).toBeInTheDocument();
    expect(screen.getByRole("button", { name: "Confirm" })).toBeInTheDocument();
    expect(screen.getByRole("button", { name: "Dispute" })).toBeInTheDocument();
  });

  it("confirms completion only after explicit confirmation", async () => {
    const user = userEvent.setup();
    show();
    await user.click(await screen.findByRole("button", { name: "Confirm" }));
    await waitFor(() =>
      expect(mocks.respond).toHaveBeenCalledWith(RECORD, "ACKNOWLEDGED"),
    );
    expect(await screen.findByText("Completed")).toBeInTheDocument();
    expect(mocks.notify).toHaveBeenCalledWith("Completion confirmed.");
  });

  it("does not show participant decisions to the owner", async () => {
    show(OWNER);
    await screen.findByText("Accessible campus research portal");
    expect(
      screen.queryByRole("button", { name: "Confirm" }),
    ).not.toBeInTheDocument();
    expect(
      screen.queryByRole("button", { name: "Dispute" }),
    ).not.toBeInTheDocument();
  });

  it("supports role filters, empty state, and a recoverable error", async () => {
    const user = userEvent.setup();
    show();
    await screen.findByText("Accessible campus research portal");
    await user.click(screen.getByRole("button", { name: "Owner" }));
    await waitFor(() =>
      expect(mocks.list).toHaveBeenLastCalledWith({ role: "OWNER" }),
    );
    cleanup();

    mocks.list.mockResolvedValueOnce({
      data: { data: { completionRecords: [] } },
    });
    show();
    expect(
      await screen.findByText("No completion records"),
    ).toBeInTheDocument();
    cleanup();

    mocks.list.mockRejectedValueOnce(
      new Error("Completion history unavailable"),
    );
    show();
    expect(
      await screen.findByText("Completion history unavailable"),
    ).toBeInTheDocument();
    expect(
      screen.getByRole("button", { name: "Try again" }),
    ).toBeInTheDocument();
  });
});
