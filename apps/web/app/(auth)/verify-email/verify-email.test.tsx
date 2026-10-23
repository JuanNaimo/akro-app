import { fireEvent, render, screen } from "@testing-library/react";
import { StrictMode } from "react";
import { beforeEach, describe, expect, it, vi } from "vitest";
import { ApiError } from "@/lib/api";
import { me, verifyEmail } from "@/lib/auth";
import { VerifyEmail } from "./verify-email";

let search = "";

vi.mock("next/navigation", () => ({
  useSearchParams: () => new URLSearchParams(search),
}));
vi.mock("@/lib/auth");

beforeEach(() => {
  vi.resetAllMocks();
  vi.mocked(me).mockRejectedValue(new ApiError(401, "Sin sesión"));
  search = "token=abc";
});

describe("VerifyEmail", () => {
  it("shows the success state", async () => {
    vi.mocked(verifyEmail).mockResolvedValue(undefined);
    render(<VerifyEmail />);

    expect(await screen.findByText("Mail verificado")).toBeInTheDocument();
    expect(verifyEmail).toHaveBeenCalledWith("abc");
  });

  it("shows the expired state", async () => {
    vi.mocked(verifyEmail).mockRejectedValue(new ApiError(400, "Vencido"));
    render(<VerifyEmail />);

    expect(
      await screen.findByText("El link venció o no es válido."),
    ).toBeInTheDocument();
  });

  it("a 429 is not an invalid link: shows the error and retries", async () => {
    vi.mocked(verifyEmail)
      .mockRejectedValueOnce(new ApiError(429, "Demasiados intentos"))
      .mockResolvedValueOnce(undefined);
    render(<VerifyEmail />);

    expect(await screen.findByText("Demasiados intentos")).toBeInTheDocument();
    fireEvent.click(screen.getByRole("button", { name: "Probar de nuevo" }));

    expect(await screen.findByText("Mail verificado")).toBeInTheDocument();
    expect(verifyEmail).toHaveBeenCalledTimes(2);
  });

  it("offers to resend when there is a session", async () => {
    vi.mocked(verifyEmail).mockRejectedValue(new ApiError(400, "Vencido"));
    vi.mocked(me).mockResolvedValue({
      id: "1",
      email: "ana@example.com",
      emailVerified: false,
    });
    render(<VerifyEmail />);

    expect(
      await screen.findByRole("button", { name: "Reenviar" }),
    ).toBeInTheDocument();
  });

  it("posts only once even if effects run twice", async () => {
    vi.mocked(verifyEmail).mockResolvedValue(undefined);
    render(
      <StrictMode>
        <VerifyEmail />
      </StrictMode>,
    );

    expect(await screen.findByText("Mail verificado")).toBeInTheDocument();
    expect(verifyEmail).toHaveBeenCalledTimes(1);
  });

  it("shows the invalid state without calling the API when there is no token", () => {
    search = "";
    render(<VerifyEmail />);

    expect(
      screen.getByText("El link venció o no es válido."),
    ).toBeInTheDocument();
    expect(verifyEmail).not.toHaveBeenCalled();
  });
});
