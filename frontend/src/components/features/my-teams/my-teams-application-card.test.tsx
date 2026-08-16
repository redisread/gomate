import { render, screen } from "@testing-library/react";
import { describe, expect, it, vi } from "vitest";
import { ApplicationCard } from "./my-teams-application-card";
import type { ApplicationRecord } from "./my-teams-types";

vi.mock("@/hooks/useI18n", () => ({
  useI18n: () => ({
    t: (key: string) => {
      const copy: Record<string, string> = {
        "myTeams.appStatusPending": "Pending",
        "myTeams.appStatusApproved": "Approved",
        "myTeams.appStatusRejected": "Rejected",
        "myTeams.appStatusCancelled": "Cancelled",
      };

      return copy[key] ?? key;
    },
  }),
}));

vi.mock("@/lib/date-utils", () => ({
  formatTimeAgo: () => "Recently",
}));

const application: ApplicationRecord = {
  id: "request-1",
  teamId: "team-1",
  userId: "user-1",
  status: "cancelled",
  message: null,
  decidedByUserId: null,
  decidedAt: null,
  createdAt: "2026-08-16T00:00:00.000Z",
  updatedAt: "2026-08-16T00:00:00.000Z",
  team: { id: "team-1", title: "Weekend Walk" },
};

describe("ApplicationCard", () => {
  it("renders a cancelled application as cancelled rather than rejected", () => {
    render(<ApplicationCard application={application} />);

    expect(screen.getByText("Cancelled")).toBeInTheDocument();
    expect(screen.queryByText("Rejected")).not.toBeInTheDocument();
  });
});
