import { cleanup, render, screen, waitFor } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { MemoryRouter, Route, Routes } from "react-router-dom";
import { AuthContext } from "../context/auth-context.js";
import { ToastContext } from "../context/toast-context.js";
import { MessagesPage } from "./MessagesPage.jsx";

const mocks = vi.hoisted(() => ({
  list: vi.fn(),
  messages: vi.fn(),
  send: vi.fn(),
  markRead: vi.fn(),
}));
vi.mock("../services/api.js", () => ({
  messagingApi: mocks,
  apiError: (error) => ({ message: error?.message || "Request failed" }),
}));

const CONVERSATION = "aaaaaaaaaaaaaaaaaaaaaaaa";
const MESSAGE = "bbbbbbbbbbbbbbbbbbbbbbbb";
const response = (data, pagination = {}) =>
  Promise.resolve({
    data: {
      data,
      meta: { pagination: { hasMore: false, nextCursor: null, ...pagination } },
    },
  });
const conversation = {
  id: CONVERSATION,
  contextType: "GIG_ENGAGEMENT",
  contextId: "c".repeat(24),
  title: "Project owner",
  participants: [],
  lastMessagePreview: "Welcome to the team",
  lastMessageAt: new Date().toISOString(),
  unreadCount: 1,
  canSend: true,
};
const existing = {
  id: MESSAGE,
  conversationId: CONVERSATION,
  sender: { id: "d".repeat(24), displayName: "Project owner" },
  body: "Welcome to the team",
  sentAt: new Date().toISOString(),
  isOwn: false,
};

function show(path = "/dashboard/messages") {
  return render(
    <MemoryRouter initialEntries={[path]}>
      <AuthContext.Provider
        value={{
          loading: false,
          isAuthenticated: true,
          user: { id: "e".repeat(24) },
        }}
      >
        <ToastContext.Provider value={{ notify: vi.fn() }}>
          <Routes>
            <Route path="/dashboard/messages" element={<MessagesPage />} />
            <Route
              path="/dashboard/messages/:conversationId"
              element={<MessagesPage />}
            />
          </Routes>
        </ToastContext.Provider>
      </AuthContext.Provider>
    </MemoryRouter>,
  );
}

beforeEach(() => {
  mocks.list.mockImplementation(() =>
    response({ conversations: [conversation] }),
  );
  mocks.messages.mockImplementation(() => response({ messages: [existing] }));
  mocks.markRead.mockImplementation(() => response({ readState: {} }));
  mocks.send.mockImplementation((_id, body) =>
    response({
      message: {
        ...existing,
        id: "f".repeat(24),
        body: body.body,
        isOwn: true,
      },
    }),
  );
});
afterEach(() => {
  cleanup();
  vi.clearAllMocks();
});

describe("messaging workspace", () => {
  it("shows bounded conversations with unread state", async () => {
    show();
    expect(await screen.findByText("Project owner")).toBeInTheDocument();
    expect(screen.getByText("Welcome to the team")).toBeInTheDocument();
    expect(screen.getByText("1")).toBeInTheDocument();
  });

  it("loads history, records read state, and sends plain text", async () => {
    const user = userEvent.setup();
    show(`/dashboard/messages/${CONVERSATION}`);
    expect(
      (await screen.findAllByText("Welcome to the team")).length,
    ).toBeGreaterThan(0);
    await waitFor(() =>
      expect(mocks.markRead).toHaveBeenCalledWith(CONVERSATION, MESSAGE),
    );
    await user.type(screen.getByLabelText("Message"), "Hello there");
    await user.click(screen.getByLabelText("Send message"));
    await waitFor(() =>
      expect(mocks.send).toHaveBeenCalledWith(
        CONVERSATION,
        expect.objectContaining({ body: "Hello there" }),
      ),
    );
    expect(await screen.findByText("Hello there")).toBeInTheDocument();
  });

  it("renders message text without interpreting HTML", async () => {
    mocks.messages.mockImplementationOnce(() =>
      response({
        messages: [{ ...existing, body: "<img src=x onerror=alert(1)>" }],
      }),
    );
    const { container } = show(`/dashboard/messages/${CONVERSATION}`);
    expect(
      await screen.findByText("<img src=x onerror=alert(1)>"),
    ).toBeInTheDocument();
    expect(container.querySelector('img[src="x"]')).toBeNull();
  });
});
