import { describe, expect, it } from "vitest";
import { safeNext } from "@/lib/safe-next";

describe("safeNext", () => {
  it.each(["/", "/check-email", "/a/b?x=1&y=2#h"])("accepts %s", (value) => {
    expect(safeNext(value)).toBe(value);
  });

  it.each([
    null,
    undefined,
    "",
    "evil.com",
    "https://evil.com",
    "//evil.com",
    "/\\evil.com",
    "/a\\b",
    "/\tevil.com",
    "/\n/evil.com",
    "/\u0000x",
    "javascript:alert(1)",
  ])("rejects %j", (value) => {
    expect(safeNext(value)).toBe("/");
  });
});
