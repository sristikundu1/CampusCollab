import { cleanup, render, screen, waitFor } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { MemoryRouter, Route, Routes } from "react-router-dom";
import { AuthContext } from "../context/auth-context.js";
import { ToastContext } from "../context/toast-context.js";
import { ProjectDetailsPage } from "./ProjectDetailsPage.jsx";
import { ProjectsPage } from "./ProjectsPage.jsx";
import { ParticipationInboxPage } from "./ParticipationInboxPage.jsx";
import { ProjectFormPage } from "./ProjectFormPage.jsx";
const mocks = vi.hoisted(() => ({
  list: vi.fn(),
  get: vi.fn(),
  create: vi.fn(),
  update: vi.fn(),
  addOpening: vi.fn(),
  updateOpening: vi.fn(),
  skillList: vi.fn(),
  join: vi.fn(),
  myJoins: vi.fn(),
  myInvites: vi.fn(),
  joinAction: vi.fn(),
  inviteAction: vi.fn(),
  notify: vi.fn(),
  confirm: vi.fn(),
}));
vi.mock("../services/api.js", () => ({
  projectApi: {
    list: mocks.list,
    get: mocks.get,
    create: mocks.create,
    update: mocks.update,
    addOpening: mocks.addOpening,
    updateOpening: mocks.updateOpening,
  },
  skillApi: { list: mocks.skillList },
  participationApi: {
    requestJoin: mocks.join,
    myJoins: mocks.myJoins,
    myInvitations: mocks.myInvites,
    joinAction: mocks.joinAction,
    invitationAction: mocks.inviteAction,
  },
  apiError: (e) => ({
    status: e?.response?.status,
    message: e?.message || "Request failed",
  }),
}));
vi.mock("../lib/confirm-action.js", () => ({ confirmAction: mocks.confirm }));
const ID = "aaaaaaaaaaaaaaaaaaaaaaaa",
  OPEN = "bbbbbbbbbbbbbbbbbbbbbbbb",
  REQUEST = "cccccccccccccccccccccccc";
const project = {
  id: ID,
  title: "Accessible campus research portal",
  description:
    "A professional collaboration project for sharing accessible student research.",
  projectType: "RESEARCH",
  skills: [{ id: "d".repeat(24), name: "React" }],
  visibility: "PLATFORM",
  expectedStartAt: null,
  expectedEndAt: null,
  openings: [
    {
      id: OPEN,
      roleName: "Frontend contributor",
      description: "Build and test the accessible user interface.",
      skills: [{ id: "d".repeat(24), name: "React" }],
      capacity: 2,
      filledCount: 0,
      remainingCapacity: 2,
      status: "OPEN",
    },
  ],
  acceptingMembers: true,
  status: "RECRUITING",
  owner: { id: "e".repeat(24), displayName: "Project Owner" },
  isOwner: false,
  isMember: false,
};
const response = (data) =>
  Promise.resolve({ data: { data, meta: { pagination: { hasMore: false } } } });
const auth = {
  loading: false,
  isAuthenticated: true,
  user: {
    id: "f".repeat(24),
    email: "student@bscse.uiu.ac.bd",
    profile: { displayName: "Student" },
  },
  logout: vi.fn(),
};
function show(ui, path) {
  return render(
    <MemoryRouter initialEntries={[path]}>
      <AuthContext.Provider value={auth}>
        <ToastContext.Provider value={{ notify: mocks.notify }}>
          {ui}
        </ToastContext.Provider>
      </AuthContext.Provider>
    </MemoryRouter>,
  );
}
beforeEach(() => {
  mocks.list.mockImplementation(() => response({ projects: [project] }));
  mocks.get.mockImplementation(() => response({ project }));
  mocks.create.mockImplementation(() => response({ project }));
  mocks.update.mockImplementation(() => response({ project }));
  mocks.addOpening.mockImplementation(() =>
    response({ opening: project.openings[0] }),
  );
  mocks.updateOpening.mockImplementation(() =>
    response({ opening: project.openings[0] }),
  );
  mocks.skillList.mockImplementation(() =>
    response({ skills: project.skills }),
  );
  mocks.join.mockImplementation(() =>
    response({ joinRequest: { id: REQUEST, status: "PENDING" } }),
  );
  mocks.myJoins.mockImplementation(() =>
    response({
      joinRequests: [
        {
          id: REQUEST,
          project: { id: ID, title: project.title },
          opening: { roleName: "Frontend contributor" },
          message: "I can help.",
          status: "PENDING",
        },
      ],
    }),
  );
  mocks.myInvites.mockImplementation(() => response({ invitations: [] }));
  mocks.confirm.mockResolvedValue(true);
  mocks.joinAction.mockImplementation(() => response({ result: {} }));
});
afterEach(() => {
  cleanup();
  vi.clearAllMocks();
});
describe("Projects collaboration workflow", () => {
  it("shows active projects as professional discovery cards", async () => {
    show(<ProjectsPage />, "/projects");
    expect(
      await screen.findByRole("heading", { name: project.title }),
    ).toBeInTheDocument();
    expect(screen.getByText(/0\/2 roles filled/)).toBeInTheDocument();
    expect(screen.getByRole("link", { name: /View/ })).toHaveAttribute(
      "href",
      `/projects/${ID}`,
    );
    expect(screen.getByRole("link", { name: "Create project" })).toHaveClass(
      "bg-white",
      "text-indigo-800",
    );
  });
  it("shows useful project discovery empty and error states", async () => {
    mocks.list.mockImplementationOnce(() => response({ projects: [] }));
    const first = show(<ProjectsPage />, "/projects");
    expect(await screen.findByText("No matching projects")).toBeInTheDocument();
    first.unmount();
    mocks.list.mockRejectedValueOnce(
      new Error("Project discovery unavailable"),
    );
    show(<ProjectsPage />, "/projects");
    expect(
      await screen.findByText("Project discovery unavailable"),
    ).toBeInTheDocument();
  });
  it("creates a project draft from validated form values", async () => {
    const user = userEvent.setup();
    show(
      <Routes>
        <Route path="/projects/new" element={<ProjectFormPage />} />
      </Routes>,
      "/projects/new",
    );
    await screen.findByRole("heading", { name: "Create a project" });
    await user.click(screen.getByRole("button", { name: "Save project" }));
    expect(mocks.create).not.toHaveBeenCalled();
    await user.type(
      screen.getByLabelText("Project title"),
      "Accessible campus research portal",
    );
    await user.type(
      screen.getByLabelText("Description"),
      "A carefully scoped project for sharing accessible student research.",
    );
    await user.type(screen.getByLabelText("Role name"), "Frontend contributor");
    await user.type(
      screen.getByLabelText("Role description"),
      "Build and test the accessible project interface.",
    );
    await user.click(screen.getByRole("button", { name: "Save project" }));
    await waitFor(() =>
      expect(mocks.create).toHaveBeenCalledWith(
        expect.objectContaining({
          title: "Accessible campus research portal",
          expectedStartAt: null,
          expectedEndAt: null,
          openings: [expect.objectContaining({ capacity: 1 })],
        }),
      ),
    );
  });
  it("loads and updates an owned project while preserving server ownership", async () => {
    const user = userEvent.setup();
    mocks.get.mockImplementationOnce(() =>
      response({ project: { ...project, isOwner: true } }),
    );
    show(
      <Routes>
        <Route path="/projects/:projectId/edit" element={<ProjectFormPage />} />
      </Routes>,
      `/projects/${ID}/edit`,
    );
    const title = await screen.findByLabelText("Project title");
    await user.clear(title);
    await user.type(title, "Updated accessible campus portal");
    await user.click(screen.getByRole("button", { name: "Save project" }));
    await waitFor(() =>
      expect(mocks.update).toHaveBeenCalledWith(
        ID,
        expect.objectContaining({
          title: "Updated accessible campus portal",
          expectedStartAt: null,
          expectedEndAt: null,
        }),
      ),
    );
    expect(mocks.updateOpening).toHaveBeenCalledWith(
      ID,
      OPEN,
      expect.objectContaining({ capacity: 2 }),
    );
  });
  it("fails closed when an edit form cannot load", async () => {
    mocks.get.mockRejectedValueOnce(new Error("Project unavailable"));
    show(
      <Routes>
        <Route path="/projects/:projectId/edit" element={<ProjectFormPage />} />
      </Routes>,
      `/projects/${ID}/edit`,
    );
    expect(
      await screen.findByRole("heading", { name: "Project form unavailable" }),
    ).toBeInTheDocument();
    expect(screen.queryByRole("button", { name: "Save project" })).toBeNull();
  });
  it("shows owners a direct edit action on project details", async () => {
    mocks.get.mockImplementationOnce(() =>
      response({ project: { ...project, isOwner: true } }),
    );
    show(
      <Routes>
        <Route path="/projects/:projectId" element={<ProjectDetailsPage />} />
      </Routes>,
      `/projects/${ID}`,
    );
    expect(
      await screen.findByRole("link", { name: "Edit project" }),
    ).toHaveAttribute("href", `/dashboard/projects/${ID}/edit`);
  });
  it("lets an authenticated student select a role and send a join request", async () => {
    const user = userEvent.setup();
    show(
      <Routes>
        <Route path="/projects/:projectId" element={<ProjectDetailsPage />} />
      </Routes>,
      `/projects/${ID}`,
    );
    await user.click(
      await screen.findByRole("button", { name: "Request this role" }),
    );
    await user.type(
      screen.getByLabelText("Join request message"),
      "I can build and test accessible React components.",
    );
    await user.click(screen.getByRole("button", { name: "Send join request" }));
    await waitFor(() =>
      expect(mocks.join).toHaveBeenCalledWith(
        ID,
        OPEN,
        expect.stringContaining("accessible"),
      ),
    );
    expect(mocks.notify).toHaveBeenCalledWith("Join request sent.");
  });
  it("shows the request lifecycle and confirms withdrawal without browser confirmation", async () => {
    const user = userEvent.setup();
    show(<ParticipationInboxPage type="joins" />, "/join-requests");
    expect(
      await screen.findByRole("heading", { name: project.title }),
    ).toBeInTheDocument();
    await user.click(screen.getByRole("button", { name: "Withdraw request" }));
    await waitFor(() => expect(mocks.confirm).toHaveBeenCalled());
    expect(mocks.joinAction).toHaveBeenCalledWith(REQUEST, "withdraw");
  });
  it("renders an empty invitation inbox clearly", async () => {
    show(<ParticipationInboxPage type="invitations" />, "/invitations");
    expect(await screen.findByText("Nothing here yet")).toBeInTheDocument();
  });
});
