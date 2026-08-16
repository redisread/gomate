import { render, screen } from "@testing-library/react";
import * as React from "react";
import { describe, expect, it, vi } from "vitest";
import { ProfileEditClient } from "../components/features/profile-edit/profile-main";

const mockProfileForm = vi.hoisted(() => vi.fn());

vi.mock("@/hooks/useI18n", () => ({
  useI18n: () => ({
    t: (key: string) => key,
    locale: "zh-CN",
    loading: false,
    getNsData: () => null,
  }),
}));

vi.mock("@/components/layout/navbar", () => ({ Navbar: () => <div data-testid="navbar" /> }));
vi.mock("@/components/layout/footer", () => ({ Footer: () => <div data-testid="footer" /> }));
vi.mock("../components/features/profile-edit/use-profile-form", () => ({
  useProfileForm: () => mockProfileForm(),
}));
vi.mock("../components/features/profile-edit/profile-form-fields", () => ({
  Card: ({ children, className, id }: { children: React.ReactNode; className?: string; id?: string }) => (
    <section id={id} aria-labelledby={id ? `${id}-title` : undefined} className={className}>{children}</section>
  ),
  CardSection: ({ title, id }: { title: string; id?: string }) => <h2 id={id}>{title}</h2>,
  AvatarSection: () => null,
  BasicInfoFields: () => null,
  OutdoorInfoFields: () => null,
  ContactFields: () => null,
  MessageBanner: () => null,
  ActionBar: () => null,
}));

describe("ProfileEditClient layout", () => {
  it("uses a navigable desktop sidebar and a single-column mobile form flow", () => {
    mockProfileForm.mockReturnValue({
      isLoading: false,
      user: { id: "user-1", name: "Victor", email: "victor@example.com" },
      avatarPreview: null,
      selectedFile: null,
      isUploading: false,
      fileInputRef: { current: null },
      handleFileChange: vi.fn(),
      cancelSelectedFile: vi.fn(),
      formData: {
        nickname: "",
        bio: "",
        level: "beginner",
        wechat: "",
        gender: "",
        birthday: "",
        regionId: "",
      },
      bioLength: 0,
      bioNearLimit: false,
      bioAtLimit: false,
      regions: [],
      handleChange: vi.fn(),
      handleRegionChange: vi.fn(),
      message: null,
      handleSubmit: vi.fn(),
      isSaving: false,
      savedDone: false,
    });

    render(<ProfileEditClient />);

    expect(screen.getByRole("complementary")).toBeInTheDocument();
    expect(screen.getByRole("navigation", { name: "profile.editTitle" })).toBeInTheDocument();
    expect(screen.getByTestId("profile-edit-shell").className).toContain("lg:grid-cols-[15rem_minmax(0,1fr)]");
    expect(screen.getByRole("heading", { name: "profile.editTitle" })).toBeInTheDocument();
    expect(screen.getByRole("region", { name: "profile.sectionBasicInfo" })).toBeInTheDocument();
  });
});
