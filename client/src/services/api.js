import axios from "axios";

export const api = axios.create({
  baseURL: import.meta.env.VITE_API_URL || "http://localhost:5000/api/v1",
  withCredentials: true,
  headers: { Accept: "application/json" },
  timeout: 15_000,
});

let csrfToken = null;
export function setCsrfToken(value) {
  csrfToken = value || null;
}
api.interceptors.request.use((config) => {
  if (
    csrfToken &&
    !["get", "head", "options"].includes(config.method?.toLowerCase())
  )
    config.headers["X-CSRF-Token"] = csrfToken;
  return config;
});

export function apiError(error) {
  const response = error?.response;
  if (!response) {
    return {
      status: undefined,
      code: error?.code,
      message:
        error?.code === "ECONNABORTED" || error?.code === "ETIMEDOUT"
          ? "The request took too long. Please try again."
          : "We couldn't connect to the server. Please check your connection and try again.",
      details: [],
    };
  }
  const fallback =
    response?.status === 429
      ? "Too many attempts. Please wait and try again."
      : response?.status === 401
        ? "Your session has expired. Please sign in again."
        : response?.status === 404
          ? "The requested resource could not be found."
          : response?.status >= 500
            ? "Something went wrong on our side. Please try again in a moment."
            : "Something went wrong. Please try again.";
  return {
    status: response?.status,
    code: response?.data?.error?.code,
    message:
      response?.status >= 500
        ? fallback
        : response?.data?.error?.message || fallback,
    details: response?.data?.error?.details || [],
  };
}

export const authApi = {
  register: (body) => api.post("/auth/register", body),
  login: (body) => api.post("/auth/login", body, { timeout: 12_000 }),
  logout: () => api.post("/auth/logout"),
  me: () => api.get("/auth/me", { timeout: 8_000 }),
  verify: (token) => api.post("/auth/verify-email", { token }),
  resend: (email) => api.post("/auth/verification/resend", { email }),
  forgot: (email) => api.post("/auth/password/forgot", { email }),
  reset: (body) => api.post("/auth/password/reset", body),
};

export const profileApi = {
  own: () => api.get("/profiles/me"),
  public: (userId) => api.get(`/profiles/${userId}`),
  update: (body) => api.patch("/profiles/me", body),
  replaceSkills: (skills) => api.put("/profiles/me/skills", { skills }),
  updateAvailability: (body) => api.patch("/profiles/me/availability", body),
  ownPortfolio: () => api.get("/profiles/me/portfolio-items"),
  publicPortfolio: (userId) => api.get(`/profiles/${userId}/portfolio-items`),
  createPortfolio: (body) => api.post("/profiles/me/portfolio-items", body),
  updatePortfolio: (itemId, body) =>
    api.patch(`/portfolio-items/${itemId}`, body),
  deletePortfolio: (itemId) => api.delete(`/portfolio-items/${itemId}`),
};

export const skillApi = {
  list: (q = "") => api.get("/skills", { params: { q, limit: 100 } }),
  create: (body) => api.post("/skills", body),
};

export const gigApi = {
  list: (params = {}) => api.get("/gigs", { params }),
  mine: (params = {}) => api.get("/gigs/mine", { params }),
  get: (gigId) => api.get(`/gigs/${gigId}`),
  create: (body) => api.post("/gigs", body),
  update: (gigId, body) => api.patch(`/gigs/${gigId}`, body),
  remove: (gigId) => api.delete(`/gigs/${gigId}`),
  transition: (gigId, action, body = {}) =>
    api.post(`/gigs/${gigId}:${action}`, body),
  bookmark: (gigId) => api.post(`/gigs/${gigId}/bookmark`),
  removeBookmark: (gigId) => api.delete(`/gigs/${gigId}/bookmark`),
  bookmarks: (params = {}) => api.get("/users/me/bookmarked-gigs", { params }),
};

const idempotent = () => ({
  headers: { "Idempotency-Key": crypto.randomUUID() },
});
export const proposalApi = {
  submit: (gigId, body) =>
    api.post(`/gigs/${gigId}/proposals`, body, idempotent()),
  mine: (params = {}) => api.get("/proposals/mine", { params }),
  get: (proposalId) => api.get(`/proposals/${proposalId}`),
  update: (proposalId, body) =>
    api.patch(`/proposals/${proposalId}`, body, idempotent()),
  withdraw: (proposalId, body = {}) =>
    api.post(`/proposals/${proposalId}:withdraw`, body, idempotent()),
  forGig: (gigId, params = {}) =>
    api.get(`/gigs/${gigId}/proposals`, { params }),
  shortlist: (proposalId, body = {}) =>
    api.post(`/proposals/${proposalId}:shortlist`, body, idempotent()),
  accept: (proposalId, body = {}) =>
    api.post(`/proposals/${proposalId}:accept`, body, idempotent()),
  reject: (proposalId, body = {}) =>
    api.post(`/proposals/${proposalId}:reject`, body, idempotent()),
};

export const projectApi = {
  list: (params = {}) => api.get("/projects", { params }),
  mine: (params = {}) => api.get("/projects/mine", { params }),
  get: (id) => api.get(`/projects/${id}`),
  create: (body) => api.post("/projects", body),
  update: (id, body) => api.patch(`/projects/${id}`, body),
  publish: (id) => api.post(`/projects/${id}:publish`, {}, idempotent()),
  transition: (id, toStatus, reason) =>
    api.post(
      `/projects/${id}:transition`,
      { toStatus, ...(reason ? { reason } : {}) },
      idempotent(),
    ),
  recruitment: (id, acceptingMembers) =>
    api.patch(
      `/projects/${id}/recruitment`,
      { acceptingMembers },
      idempotent(),
    ),
  addOpening: (id, body) => api.post(`/projects/${id}/openings`, body),
  updateOpening: (id, openingId, body) =>
    api.patch(`/projects/${id}/openings/${openingId}`, body),
  openingState: (id, openingId, action) =>
    api.post(
      `/projects/${id}/openings/${openingId}:${action}`,
      {},
      idempotent(),
    ),
  joins: (id, params = {}) =>
    api.get(`/projects/${id}/join-requests`, { params }),
  invitations: (id, params = {}) =>
    api.get(`/projects/${id}/invitations`, { params }),
  members: (id) => api.get(`/projects/${id}/members`),
  candidates: (id, q) =>
    api.get(`/projects/${id}/invite-candidates`, { params: { q } }),
};
export const participationApi = {
  requestJoin: (projectId, openingId, message) =>
    api.post(
      `/projects/${projectId}/openings/${openingId}/join-requests`,
      { message },
      idempotent(),
    ),
  myJoins: (params = {}) => api.get("/join-requests/mine", { params }),
  joinAction: (id, action, reason) =>
    api.post(
      `/join-requests/${id}:${action}`,
      reason ? { reason } : {},
      idempotent(),
    ),
  invite: (projectId, openingId, body) =>
    api.post(
      `/projects/${projectId}/openings/${openingId}/invitations`,
      body,
      idempotent(),
    ),
  myInvitations: (params = {}) => api.get("/invitations/mine", { params }),
  invitationAction: (id, action, reason) =>
    api.post(
      `/invitations/${id}:${action}`,
      reason ? { reason } : {},
      idempotent(),
    ),
  leave: (projectId, membershipId) =>
    api.post(
      `/projects/${projectId}/members/${membershipId}:leave`,
      {},
      idempotent(),
    ),
  remove: (projectId, membershipId) =>
    api.post(
      `/projects/${projectId}/members/${membershipId}:remove`,
      {},
      idempotent(),
    ),
};
