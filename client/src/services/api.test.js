import { describe, expect, it } from "vitest";
import { api } from "./api.js";

describe("API transport", () => {
  it("uses the same-origin API path so session cookies remain first-party", () => {
    expect(api.defaults.baseURL).toBe("/api/v1");
    expect(api.defaults.withCredentials).toBe(true);
  });
});
