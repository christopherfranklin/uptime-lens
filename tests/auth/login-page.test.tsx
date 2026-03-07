import {
  cleanup,
  fireEvent,
  render,
  screen,
  waitFor,
} from "@testing-library/react";
import { afterEach, beforeEach, describe, expect, test, vi } from "vitest";

let mockSignInMagicLink: ReturnType<typeof vi.fn>;

vi.mock("@/lib/auth-client", () => ({
  authClient: {
    signIn: {
      get magicLink() {
        return mockSignInMagicLink;
      },
    },
  },
}));

describe("Login Page", () => {
  beforeEach(() => {
    mockSignInMagicLink = vi.fn();
  });

  afterEach(() => {
    cleanup();
    vi.restoreAllMocks();
  });

  test("renders email input field", async () => {
    const { default: LoginPage } = await import("@/app/(auth)/login/page");
    render(<LoginPage />);

    const emailInput = screen.getByLabelText("Email address");
    expect(emailInput).toBeDefined();
    expect(emailInput.getAttribute("type")).toBe("email");
    expect(emailInput.getAttribute("placeholder")).toBe("you@example.com");
  });

  test("renders 'Send magic link' submit button", async () => {
    const { default: LoginPage } = await import("@/app/(auth)/login/page");
    render(<LoginPage />);

    const submitButton = screen.getByRole("button", {
      name: "Send magic link",
    });
    expect(submitButton).toBeDefined();
    expect(submitButton.getAttribute("type")).toBe("submit");
  });

  test("shows 'Check your email' message after successful submission", async () => {
    mockSignInMagicLink.mockResolvedValue({ error: null });

    const { default: LoginPage } = await import("@/app/(auth)/login/page");
    render(<LoginPage />);

    const emailInput = screen.getByLabelText("Email address");
    fireEvent.change(emailInput, { target: { value: "test@example.com" } });

    const submitButton = screen.getByRole("button", {
      name: "Send magic link",
    });
    fireEvent.click(submitButton);

    await waitFor(() => {
      expect(screen.getByText("Check your email")).toBeDefined();
    });

    expect(screen.getByText(/test@example.com/)).toBeDefined();
  });

  test("shows resend button in sent state", async () => {
    mockSignInMagicLink.mockResolvedValue({ error: null });

    const { default: LoginPage } = await import("@/app/(auth)/login/page");
    render(<LoginPage />);

    const emailInput = screen.getByLabelText("Email address");
    fireEvent.change(emailInput, { target: { value: "test@example.com" } });

    const submitButton = screen.getByRole("button", {
      name: "Send magic link",
    });
    fireEvent.click(submitButton);

    await waitFor(() => {
      expect(screen.getByText("Check your email")).toBeDefined();
    });

    const resendButton = screen.getByRole("button", { name: "Resend link" });
    expect(resendButton).toBeDefined();
  });

  test("shows error message with resend button on failure", async () => {
    mockSignInMagicLink.mockResolvedValue({
      error: { message: "Too many requests" },
    });

    const { default: LoginPage } = await import("@/app/(auth)/login/page");
    render(<LoginPage />);

    const emailInput = screen.getByLabelText("Email address");
    fireEvent.change(emailInput, { target: { value: "test@example.com" } });

    const submitButton = screen.getByRole("button", {
      name: "Send magic link",
    });
    fireEvent.click(submitButton);

    await waitFor(() => {
      expect(screen.getByText("Too many requests")).toBeDefined();
    });

    const resendButton = screen.getByRole("button", { name: "Resend link" });
    expect(resendButton).toBeDefined();
  });
});
