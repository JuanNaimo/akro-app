import { afterEach, describe, expect, it, vi } from "vitest";
import { ApiError, apiFetch } from "@/lib/api";

const GENERIC = "Algo salió mal. Probá de nuevo en un rato.";

function mockFetch(response: Response | Error) {
  const fetchMock = vi.fn(() =>
    response instanceof Error
      ? Promise.reject(response)
      : Promise.resolve(response),
  );
  vi.stubGlobal("fetch", fetchMock);
  return fetchMock;
}

async function catchError(promise: Promise<unknown>): Promise<ApiError> {
  try {
    await promise;
  } catch (error) {
    expect(error).toBeInstanceOf(ApiError);
    return error as ApiError;
  }
  throw new Error("apiFetch no tiró");
}

afterEach(() => vi.unstubAllGlobals());

describe("apiFetch", () => {
  it("sends JSON same-origin and returns the parsed body", async () => {
    const fetchMock = mockFetch(Response.json({ id: "1" }));
    const data = await apiFetch("/api/x", { method: "POST", json: { a: 1 } });

    expect(data).toEqual({ id: "1" });
    const [path, init] = fetchMock.mock.calls[0] as unknown as [
      string,
      RequestInit,
    ];
    expect(path).toBe("/api/x");
    expect(init.credentials).toBe("same-origin");
    expect(init.body).toBe('{"a":1}');
    expect(new Headers(init.headers).get("Content-Type")).toBe(
      "application/json",
    );
  });

  it("returns undefined on 204", async () => {
    mockFetch(new Response(null, { status: 204 }));
    expect(await apiFetch("/api/x")).toBeUndefined();
  });

  it("maps issues to fieldErrors, first message per path", async () => {
    mockFetch(
      Response.json(
        {
          statusCode: 400,
          message: "Datos inválidos",
          issues: [
            { path: "email", message: "Mail inválido" },
            { path: "email", message: "Otro" },
            { path: "password", message: "Muy corta" },
          ],
        },
        { status: 400 },
      ),
    );
    const error = await catchError(apiFetch("/api/x"));
    expect(error.status).toBe(400);
    expect(error.message).toBe("Datos inválidos");
    expect(error.fieldErrors).toEqual({
      email: "Mail inválido",
      password: "Muy corta",
    });
  });

  it.each([401, 409, 429])("keeps the API message on %i", async (status) => {
    mockFetch(
      Response.json(
        { statusCode: status, message: "Mensaje del API" },
        { status },
      ),
    );
    const error = await catchError(apiFetch("/api/x"));
    expect(error.status).toBe(status);
    expect(error.message).toBe("Mensaje del API");
    expect(error.fieldErrors).toEqual({});
  });

  it("uses the generic message on 500", async () => {
    mockFetch(
      Response.json({ statusCode: 500, message: "detalle" }, { status: 500 }),
    );
    const error = await catchError(apiFetch("/api/x"));
    expect(error.status).toBe(500);
    expect(error.message).toBe(GENERIC);
  });

  it("uses the generic message when the body is not JSON", async () => {
    mockFetch(new Response("<html>Bad gateway</html>", { status: 502 }));
    expect((await catchError(apiFetch("/api/x"))).message).toBe(GENERIC);

    mockFetch(new Response("nope", { status: 404 }));
    expect((await catchError(apiFetch("/api/x"))).message).toBe(GENERIC);
  });

  it("throws status 0 when fetch rejects", async () => {
    mockFetch(new TypeError("Failed to fetch"));
    const error = await catchError(apiFetch("/api/x"));
    expect(error.status).toBe(0);
    expect(error.message).toBe(
      "No hay conexión. Revisá tu internet y probá de nuevo.",
    );
  });
});
