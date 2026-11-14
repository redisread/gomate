import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { synchronizeTeamCreateLogout, watchTeamCreateLogout } from "./team-create-logout";

let stop: (() => void) | undefined;
beforeEach(() => { sessionStorage.clear(); localStorage.clear(); });
afterEach(() => { stop?.(); stop = undefined; });
const marker = "gomate.team-create.logout.first";
const record = "gomate.team-create.first";

describe("cross-tab creation logout", () => {
  it("clears a sleeping tab's old record before restore without touching another user", () => {
    sessionStorage.setItem(record, "private old operation");
    sessionStorage.setItem("gomate.team-create.other", "other operation");
    localStorage.setItem(marker, "confirmed-logout");
    expect(synchronizeTeamCreateLogout("first")).toBe(true);
    expect(sessionStorage.getItem(record)).toBeNull();
    expect(sessionStorage.getItem("gomate.team-create.other")).toBe("other operation");
    sessionStorage.setItem(record, "new operation after login");
    expect(synchronizeTeamCreateLogout("first")).toBe(false);
    expect(sessionStorage.getItem(record)).toBe("new operation after login");
  });

  it("ignores delayed duplicate and older signals after a new login", () => {
    localStorage.setItem(marker, "newest");
    synchronizeTeamCreateLogout("first");
    sessionStorage.setItem(record, "new operation");
    const invalidate = vi.fn();
    stop = watchTeamCreateLogout("first", invalidate);
    for (const epoch of ["older", "newest"]) {
      window.dispatchEvent(new CustomEvent("gomate.team-create.logout", { detail: { userId: "first", epoch } }));
    }
    expect(invalidate).not.toHaveBeenCalled();
    expect(sessionStorage.getItem(record)).toBe("new operation");
  });

  it("clears and invalidates only the account named by a confirmed storage signal", () => {
    sessionStorage.setItem(record, "private operation");
    const invalidate = vi.fn();
    stop = watchTeamCreateLogout("first", invalidate);
    window.dispatchEvent(new StorageEvent("storage", { key: "gomate.team-create.logout.other", newValue: "other-epoch" }));
    expect(invalidate).not.toHaveBeenCalled();
    localStorage.setItem(marker, "logout");
    window.dispatchEvent(new StorageEvent("storage", { key: marker, newValue: "logout" }));
    expect(invalidate).toHaveBeenCalledTimes(1);
    expect(sessionStorage.getItem(record)).toBeNull();
  });
});
