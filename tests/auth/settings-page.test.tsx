import { cleanup, render, screen } from "@testing-library/react";
import { afterEach, describe, expect, test, vi } from "vitest";

vi.mock("@/lib/auth-client", () => ({
  authClient: {
    changeEmail: vi.fn().mockResolvedValue({ error: null }),
  },
}));

vi.mock("@/app/actions/auth", () => ({
  logout: vi.fn(),
}));

describe("Settings Page", () => {
  afterEach(() => {
    cleanup();
  });

  test("renders current email as read-only", async () => {
    const { SettingsClient } = await import(
      "@/app/(dashboard)/settings/settings-client"
    );
    render(<SettingsClient currentEmail="user@example.com" />);

    expect(screen.getByText("user@example.com")).toBeDefined();
  });

  test("renders new email input for email change", async () => {
    const { SettingsClient } = await import(
      "@/app/(dashboard)/settings/settings-client"
    );
    render(<SettingsClient currentEmail="user@example.com" />);

    const newEmailInput = screen.getByLabelText("New email address");
    expect(newEmailInput).toBeDefined();
    expect(newEmailInput.getAttribute("type")).toBe("email");
  });

  test("renders logout button", async () => {
    const { SettingsClient } = await import(
      "@/app/(dashboard)/settings/settings-client"
    );
    render(<SettingsClient currentEmail="user@example.com" />);

    const logoutButton = screen.getByRole("button", { name: "Log out" });
    expect(logoutButton).toBeDefined();
  });
});
