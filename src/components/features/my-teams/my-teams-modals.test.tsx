import { fireEvent, render, screen } from "@testing-library/react";
import { expect, it, vi } from "vitest";
import { CancelTeamModal, FormTeamModal } from "./my-teams-modals";
vi.mock("@/hooks/useI18n", () => ({ useI18n: () => ({ t: (key: string) => key }) }));
it.each([false, true])("uses a keyboard-accessible confirmation modal (form=%s)", (form) => {
  const close = vi.fn();
  render(form ? <FormTeamModal teamId="one" isFull isForming={false} onConfirm={vi.fn()} onCancel={close} /> : <CancelTeamModal teamId="one" isCancelling={false} onConfirm={vi.fn()} onCancel={close} />);
  expect(screen.getByRole("alertdialog")).toHaveAccessibleName(form ? "teams.formTeamConfirm" : "teams.cancelTeam");
  fireEvent.keyDown(document, { key: "Escape" });
  expect(close).toHaveBeenCalled();
});
