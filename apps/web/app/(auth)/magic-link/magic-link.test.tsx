import { fireEvent, render, screen, waitFor } from "@testing-library/react";
import { StrictMode } from "react";
import { beforeEach, describe, expect, it, vi } from "vitest";
import { ApiError } from "@/lib/api";
import { verifyMagicLink } from "@/lib/auth";
import { MagicLink } from "./magic-link";

const replace = vi.fn();
let search = "";

vi.mock("next/navigation", () => ({
  useRouter: () => ({ replace }),
  useSearchParams: () => new URLSearchParams(search),
}));
vi.mock("@/lib/auth");

beforeEach(() => {
  vi.resetAllMocks();
  search = "token=abc";
});

describe("MagicLink", () => {
  it("replaces to / on success, posting only once", async () => {
    vi.mocked(verifyMagicLink).mockResolvedValue({
      id: "1",
      email: "ana@example.com",
      emailVerified: true,
    });
    render(
      <StrictMode>
        <MagicLink />
      </StrictMode>,
    );

    await waitFor(() => expect(replace).toHaveBeenCalledWith("/"));
    expect(verifyMagicLink).toHaveBeenCalledTimes(1);
    expect(verifyMagicLink).toHaveBeenCalledWith("abc");
  });

  it("shows the invalid state with a link to /login", async () => {
    vi.mocked(verifyMagicLink).mockRejectedValue(new ApiError(400, "Vencido"));
    render(<MagicLink />);

    expect(
      await screen.findByText("El link venció o no es válido."),
    ).toBeInTheDocument();
    expect(screen.getByRole("link")).toHaveAttribute("href", "/login");
    expect(replace).not.toHaveBeenCalled();
  });

  it("offline is not an invalid link: shows the error and retries", async () => {
    vi.mocked(verifyMagicLink)
      .mockRejectedValueOnce(new ApiError(0, "No hay conexión."))
      .mockResolvedValueOnce({
        id: "1",
        email: "ana@example.com",
        emailVerified: true,
      });
    render(<MagicLink />);

    expect(await screen.findByText("No hay conexión.")).toBeInTheDocument();
    expect(
      screen.queryByText("El link venció o no es válido."),
    ).not.toBeInTheDocument();

    fireEvent.click(screen.getByRole("button", { name: "Probar de nuevo" }));
    await waitFor(() => expect(replace).toHaveBeenCalledWith("/"));
    expect(verifyMagicLink).toHaveBeenCalledTimes(2);
  });

  it("does not call the API without a token", () => {
    search = "";
    render(<MagicLink />);

    expect(
      screen.getByText("El link venció o no es válido."),
    ).toBeInTheDocument();
    expect(verifyMagicLink).not.toHaveBeenCalled();
  });
});
