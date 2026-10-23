import { render, screen } from "@testing-library/react";
import { describe, expect, it } from "vitest";
import { Button } from "@/components/ui/button";
import { TextField } from "@/components/ui/text-field";

describe("TextField", () => {
  it("wires the error to the input", () => {
    render(<TextField label="Mail" error="Mail inválido" />);
    const input = screen.getByLabelText("Mail");
    const error = screen.getByText("Mail inválido");

    expect(input).toHaveAttribute("aria-invalid", "true");
    expect(input).toHaveAttribute("aria-describedby", error.id);
  });

  it("is valid and undescribed without error", () => {
    render(<TextField label="Mail" />);
    const input = screen.getByLabelText("Mail");

    expect(input).not.toHaveAttribute("aria-invalid");
    expect(input).not.toHaveAttribute("aria-describedby");
  });
});

describe("Button", () => {
  it("is disabled and busy while loading", () => {
    render(<Button loading>Entrar</Button>);
    const button = screen.getByRole("button", { name: "Entrar" });

    expect(button).toBeDisabled();
    expect(button).toHaveAttribute("aria-busy", "true");
  });

  it("is enabled by default", () => {
    render(<Button>Entrar</Button>);
    expect(screen.getByRole("button", { name: "Entrar" })).toBeEnabled();
  });
});
