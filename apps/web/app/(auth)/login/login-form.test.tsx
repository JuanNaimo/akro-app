import { render, screen, waitFor } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { beforeEach, describe, expect, it, vi } from "vitest";
import { ApiError } from "@/lib/api";
import { login, requestMagicLink } from "@/lib/auth";
import { LoginForm } from "./login-form";

const replace = vi.fn();
let search = "";

vi.mock("next/navigation", () => ({
  useRouter: () => ({ replace }),
  useSearchParams: () => new URLSearchParams(search),
}));
vi.mock("@/lib/auth");

// Generada en cada corrida: GitGuardian marca las contraseñas literales aunque sean de prueba.
const password = crypto.randomUUID();

async function fillAndSubmit() {
  const user = userEvent.setup();
  await user.type(screen.getByLabelText("Mail"), "ana@example.com");
  await user.type(screen.getByLabelText("Contraseña"), password);
  await user.click(screen.getByRole("button", { name: "Entrar" }));
}

beforeEach(() => {
  vi.resetAllMocks();
  search = "";
});

describe("LoginForm", () => {
  it("shows the field error under the field", async () => {
    vi.mocked(login).mockRejectedValue(
      new ApiError(400, "Datos inválidos", { email: "Mail inválido" }),
    );
    render(<LoginForm />);
    await fillAndSubmit();

    expect(await screen.findByText("Mail inválido")).toBeInTheDocument();
    expect(replace).not.toHaveBeenCalled();
  });

  it("shows the general error on 401", async () => {
    vi.mocked(login).mockRejectedValue(
      new ApiError(401, "Mail o contraseña incorrectos"),
    );
    render(<LoginForm />);
    await fillAndSubmit();

    expect(await screen.findByRole("alert")).toHaveTextContent(
      "Mail o contraseña incorrectos",
    );
    // El mail se conserva después de que React resetea el formulario.
    expect(screen.getByLabelText("Mail")).toHaveValue("ana@example.com");
  });

  it("redirects to a safe next", async () => {
    vi.mocked(login).mockResolvedValue({
      id: "1",
      email: "ana@example.com",
      emailVerified: true,
    });
    search = "next=/check-email";
    render(<LoginForm />);
    await fillAndSubmit();

    await waitFor(() => expect(replace).toHaveBeenCalledWith("/check-email"));
  });

  it.each(["//evil.com", "/\\evil.com"])(
    "ignores the malicious next %s",
    async (next) => {
      vi.mocked(login).mockResolvedValue({
        id: "1",
        email: "ana@example.com",
        emailVerified: true,
      });
      search = `next=${encodeURIComponent(next)}`;
      render(<LoginForm />);
      await fillAndSubmit();

      await waitFor(() => expect(replace).toHaveBeenCalledWith("/"));
    },
  );

  it("does not call the API for the magic link with an empty email", async () => {
    render(<LoginForm />);
    await userEvent.click(
      screen.getByRole("button", { name: "Mandame un link para entrar" }),
    );

    expect(
      await screen.findByText("Ingresá tu mail para mandarte el link."),
    ).toBeInTheDocument();
    expect(requestMagicLink).not.toHaveBeenCalled();
  });

  it("requests the magic link with the typed email and confirms", async () => {
    vi.mocked(requestMagicLink).mockResolvedValue(undefined);
    const user = userEvent.setup();
    render(<LoginForm />);
    await user.type(screen.getByLabelText("Mail"), "ana@example.com");
    await user.click(
      screen.getByRole("button", { name: "Mandame un link para entrar" }),
    );

    expect(requestMagicLink).toHaveBeenCalledWith("ana@example.com");
    expect(await screen.findByRole("status")).toHaveTextContent(
      "vence en 15 minutos",
    );
  });
});
