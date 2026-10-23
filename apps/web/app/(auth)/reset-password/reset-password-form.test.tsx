import { render, screen } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { beforeEach, describe, expect, it, vi } from "vitest";
import { resetPassword } from "@/lib/auth";
import { ResetPasswordForm } from "./reset-password-form";

let search = "";

vi.mock("next/navigation", () => ({
  useSearchParams: () => new URLSearchParams(search),
}));
vi.mock("@/lib/auth");

// Generada en cada corrida: GitGuardian marca las contraseñas literales aunque sean de prueba.
const password = crypto.randomUUID();

beforeEach(() => {
  vi.resetAllMocks();
  search = "token=abc";
});

describe("ResetPasswordForm", () => {
  it("shows «Listo» with a link to /login on success", async () => {
    vi.mocked(resetPassword).mockResolvedValue(undefined);
    const user = userEvent.setup();
    render(<ResetPasswordForm />);
    await user.type(screen.getByLabelText("Contraseña nueva"), password);
    await user.click(
      screen.getByRole("button", { name: "Cambiar contraseña" }),
    );

    expect(await screen.findByText(/Listo/)).toBeInTheDocument();
    expect(resetPassword).toHaveBeenCalledWith({
      token: "abc",
      password,
    });
    expect(screen.getByRole("link", { name: "Entrar" })).toHaveAttribute(
      "href",
      "/login",
    );
  });

  it("shows the invalid link state without a token", () => {
    search = "";
    render(<ResetPasswordForm />);

    expect(
      screen.getByText("El link venció o no es válido."),
    ).toBeInTheDocument();
    expect(screen.getByRole("link")).toHaveAttribute("href", "/forgot-password");
  });
});
