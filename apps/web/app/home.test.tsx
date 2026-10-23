import { render, screen, waitFor } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { beforeEach, describe, expect, it, vi } from "vitest";
import { ApiError } from "@/lib/api";
import { logout, me } from "@/lib/auth";
import { hardNavigate } from "@/lib/navigation";
import { Home } from "./home";

const replace = vi.fn();

vi.mock("next/navigation", () => ({ useRouter: () => ({ replace }) }));
vi.mock("@/lib/auth");
vi.mock("@/lib/navigation");

beforeEach(() => {
  vi.resetAllMocks();
  vi.mocked(me).mockResolvedValue({
    id: "1",
    email: "ana@example.com",
    emailVerified: true,
  });
});

describe("Home", () => {
  it("signs out with a full reload of /login, so nothing of the account stays in memory", async () => {
    vi.mocked(logout).mockResolvedValue(undefined);
    const user = userEvent.setup();
    render(<Home />);

    await user.click(await screen.findByRole("button", { name: "Salir" }));

    await waitFor(() => expect(hardNavigate).toHaveBeenCalledWith("/login"));
    // No con el router de Next: mantendría el formulario de /login con el mail anterior.
    expect(replace).not.toHaveBeenCalled();
  });

  it("shows the error and stays when signing out fails", async () => {
    vi.mocked(logout).mockRejectedValue(new ApiError(0, "No hay conexión."));
    const user = userEvent.setup();
    render(<Home />);

    await user.click(await screen.findByRole("button", { name: "Salir" }));

    expect(await screen.findByText("No hay conexión.")).toBeInTheDocument();
    expect(hardNavigate).not.toHaveBeenCalled();
  });

  it("goes to /login without a session", async () => {
    vi.mocked(me).mockRejectedValue(new ApiError(401, "Tenés que iniciar sesión"));
    render(<Home />);

    await waitFor(() => expect(replace).toHaveBeenCalledWith("/login"));
  });
});
