import { api, ApiError } from "../api";

jest.mock("../auth-client", () => ({ authClient: { getCookie: jest.fn(async () => "better-auth.session_token=abc") } }));
jest.mock("../config", () => ({ API_URL: "https://api.test", APP_SCHEME: "studypilot" }));

const respond = (status: number, body: unknown) =>
  jest.fn(async () => ({ ok: status < 400, status, json: async () => body }) as unknown as Response);

describe("api client", () => {
  it("sends the stored session as a cookie and JSON bodies with the right header", async () => {
    const fetchMock = respond(200, { course: { id: "c1" } });
    const data = await api<{ course: { id: string } }>("/api/v1/courses", { method: "POST", body: { name: "Bio" } }, fetchMock as unknown as typeof fetch);
    expect(data.course.id).toBe("c1");
    const [url, init] = fetchMock.mock.calls[0] as unknown as [string, RequestInit];
    expect(url).toBe("https://api.test/api/v1/courses");
    expect(init.method).toBe("POST");
    expect(init.credentials).toBe("omit");
    expect(init.headers).toMatchObject({ Cookie: "better-auth.session_token=abc", "Content-Type": "application/json" });
    expect(init.body).toBe('{"name":"Bio"}');
  });

  it("turns validation errors into readable messages", async () => {
    const fetchMock = respond(400, { error: "invalid", issues: [{ path: "name", message: "Name is required" }] });
    await expect(api("/api/v1/courses", { method: "POST", body: {} }, fetchMock as unknown as typeof fetch)).rejects.toMatchObject({
      status: 400,
      message: "Name is required",
    });
  });

  it("explains expired sessions, missing records and network failures", async () => {
    await expect(api("/x", {}, respond(401, { error: "unauthorized" }) as unknown as typeof fetch)).rejects.toThrow(/sign in again/);
    await expect(api("/x", {}, respond(404, { error: "not_found" }) as unknown as typeof fetch)).rejects.toThrow(/no longer exists/);
    const offline = jest.fn(async () => {
      throw new TypeError("Network request failed");
    });
    const err: unknown = await api("/x", {}, offline as unknown as typeof fetch).catch((e: unknown) => e);
    expect(err).toBeInstanceOf(ApiError);
    expect((err as Error).message).toMatch(/Can't reach StudyPilot/);
  });
});
