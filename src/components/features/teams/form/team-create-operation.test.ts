import { afterEach, describe, expect, it } from "vitest";
import {
  clearTeamCreateOperation, discardTeamCreateRecord, newTeamCreateOperation, readTeamCreateOperation,
  saveTeamCreateOperation,
} from "./team-create-operation";

afterEach(() => sessionStorage.clear());

const operation = () => newTeamCreateOperation({
  requestId: crypto.randomUUID(), locationId: "location", title: "一起出发",
  activityType: "hiking", maxParticipants: 6,
  startAt: "2099-08-16T09:00:00+08:00", endAt: "2099-08-16T13:00:00+08:00",
});

describe("persisted team creation", () => {
  it("retains the original operation on reload and isolates users", () => {
    const saved = operation();
    saveTeamCreateOperation(sessionStorage, "first", saved);
    expect(readTeamCreateOperation(sessionStorage, "first")).toEqual(saved);
    expect(readTeamCreateOperation(sessionStorage, "second")).toBeNull();
    expect(() => saveTeamCreateOperation(sessionStorage, "first", operation())).toThrow();
    expect(readTeamCreateOperation(sessionStorage, "first")).toEqual(saved);
  });

  it("only clears a matching resolved operation", () => {
    const saved = operation();
    saveTeamCreateOperation(sessionStorage, "first", saved);
    clearTeamCreateOperation(sessionStorage, "first", crypto.randomUUID());
    expect(readTeamCreateOperation(sessionStorage, "first")).toEqual(saved);
    clearTeamCreateOperation(sessionStorage, "first", saved.requestId);
    expect(readTeamCreateOperation(sessionStorage, "first")).toBeNull();
  });

  it("refuses malformed stored data instead of silently starting a new operation", () => {
    sessionStorage.setItem("gomate.team-create.first", '{"title":"partial"}');
    expect(() => readTeamCreateOperation(sessionStorage, "first")).toThrow();
    expect(() => saveTeamCreateOperation(sessionStorage, "first", operation())).toThrow();
    expect(sessionStorage.getItem("gomate.team-create.first")).toBe('{"title":"partial"}');
  });

  it("refuses manual reconciliation if the captured record has changed", () => {
    const old = "{broken";
    sessionStorage.setItem("gomate.team-create.first", old);
    sessionStorage.setItem("gomate.team-create.first", JSON.stringify(operation()));
    const current = sessionStorage.getItem("gomate.team-create.first");
    expect(() => discardTeamCreateRecord(sessionStorage, "first", old)).toThrow();
    expect(sessionStorage.getItem("gomate.team-create.first")).toBe(current);
  });
});
