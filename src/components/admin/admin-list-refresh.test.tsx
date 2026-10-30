import { act, fireEvent, render, screen, waitFor } from "@testing-library/react";
import { beforeEach, expect, it, vi } from "vitest";
import { AdminUsersManager } from "./admin-users-manager";
import { AdminLocationsManager } from "./admin-locations-manager";

const api = vi.hoisted(() => vi.fn());
const t = vi.hoisted(() => (key: string) => key);
vi.mock("@/lib/api", () => ({ fetchAPI: api }));
vi.mock("@/hooks/useI18n", () => ({ useI18n: () => ({ t }) }));
beforeEach(() => api.mockReset());
const response = (key: string, name: string) => new Response(JSON.stringify({ success: true, [key]: [{ id: name, name, status: "published", role: "user", email: "test@example.test" }], nextCursor: null }));
for (const key of ["users", "locations"]) {
  it(`${key}: retains content and ignores an older search that finishes last`, async () => {
    api.mockResolvedValueOnce(response(key, "original"));
    render(key === "users" ? <AdminUsersManager adminId="admin" /> : <AdminLocationsManager />);
    await screen.findByRole("heading", { name: "original" });
    let resolve!: (value: Response) => void;
    api.mockReturnValueOnce(new Promise((done) => { resolve = done; }));
    fireEvent.submit(screen.getByRole("search"));
    expect(screen.getByRole("heading", { name: "original" })).toBeVisible();
    api.mockResolvedValueOnce(response(key, "newest"));
    fireEvent.change(screen.getByRole("searchbox"), { target: { value: "new" } });
    fireEvent.submit(screen.getByRole("search"));
    await screen.findByRole("heading", { name: "newest" });
    await act(async () => resolve(response(key, "old")));
    await waitFor(() => expect(screen.queryByRole("heading", { name: "old" })).not.toBeInTheDocument());
    expect(screen.getByRole("heading", { name: "newest" })).toBeVisible();
  });
}
