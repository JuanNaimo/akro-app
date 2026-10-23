import { describe, expect, it } from "vitest";
import { ApiError } from "@/lib/api";
import { errorState, GENERIC_ERROR } from "@/lib/form-state";

describe("errorState", () => {
  it("puts the issues of visible fields under each field", () => {
    const state = errorState(
      new ApiError(400, "Datos inválidos", { email: "Mail inválido" }),
    );

    expect(state.fieldErrors).toEqual({ email: "Mail inválido" });
    expect(state.error).toBeUndefined();
  });

  it("shows a general error when an issue has no field on screen", () => {
    const state = errorState(
      new ApiError(400, "Datos inválidos", { token: "Muy largo" }),
    );

    expect(state.error).toBe("Datos inválidos");
  });

  it("uses the API message without issues and a generic one otherwise", () => {
    expect(errorState(new ApiError(409, "Ya hay una cuenta")).error).toBe(
      "Ya hay una cuenta",
    );
    expect(errorState(new Error("boom")).error).toBe(GENERIC_ERROR);
  });
});
