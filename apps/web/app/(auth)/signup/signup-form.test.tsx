import { render, screen, waitFor } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { beforeEach, describe, expect, it, vi } from "vitest";
import { ApiError } from "@/lib/api";
import { signup } from "@/lib/auth";
import { SignupForm } from "./signup-form";

const replace = vi.fn();

vi.mock("next/navigation", () => ({ useRouter: () => ({ replace }) }));
vi.mock("@/lib/auth");

// Generada en cada corrida: GitGuardian marca las contraseñas literales aunque sean de prueba.
const password = crypto.randomUUID();

async function fillAndSubmit() {
  const user = userEvent.setup();
  await user.type(screen.getByLabelText("Mail"), "ana@example.com");
  await user.type(screen.getByLabelText("Contraseña"), password);
  await user.click(screen.getByRole("button", { name: "Crear cuenta" }));
}

beforeEach(() => vi.resetAllMocks());

describe("SignupForm", () => {
  it("has the HTML validation for a new password", () => {
    render(<SignupForm />);
    const passwordInput = screen.getByLabelText("Contraseña");
    expect(passwordInput).toHaveAttribute("minlength", "8");
    expect(passwordInput).toHaveAttribute("maxlength", "128");
    expect(passwordInput).toHaveAttribute("autocomplete", "new-password");
  });

  it("shows the 409", async () => {
    vi.mocked(signup).mockRejectedValue(
      new ApiError(409, "Ya hay una cuenta con ese mail"),
    );
    render(<SignupForm />);
    await fillAndSubmit();

    expect(await screen.findByRole("alert")).toHaveTextContent(
      "Ya hay una cuenta con ese mail",
    );
    expect(replace).not.toHaveBeenCalled();
  });

  it("goes to /check-email on success", async () => {
    vi.mocked(signup).mockResolvedValue({
      id: "1",
      email: "ana@example.com",
      emailVerified: false,
    });
    render(<SignupForm />);
    await fillAndSubmit();

    await waitFor(() => expect(replace).toHaveBeenCalledWith("/check-email"));
  });
});
