import { describe, it, expect, vi } from "vitest";
import { parseVoiceResponse, handleRequest, type Deps } from "./logic.ts";

// ─── parseVoiceResponse ───────────────────────────────────────────────────────

describe("parseVoiceResponse", () => {
  it("parses a valid response with tasks", () => {
    const text = '{"tasks":[{"name":"Write report","minutes":30}]}';
    const result = parseVoiceResponse(text);
    expect(result.tasks).toHaveLength(1);
    expect(result.tasks[0].name).toBe("Write report");
    expect(result.tasks[0].minutes).toBe(30);
  });

  it("preserves optional context field when present", () => {
    const text = '{"tasks":[{"name":"Prepare deck","minutes":60,"context":"For the board meeting on Thursday."}]}';
    const result = parseVoiceResponse(text);
    expect(result.tasks[0].context).toBe("For the board meeting on Thursday.");
  });

  it("preserves optional category field when present", () => {
    const text = '{"tasks":[{"name":"Go for a run","minutes":45,"category":"Health"}]}';
    const result = parseVoiceResponse(text);
    expect(result.tasks[0].category).toBe("Health");
  });

  it("allows tasks without context or category", () => {
    const text = '{"tasks":[{"name":"Email Sarah","minutes":10}]}';
    const result = parseVoiceResponse(text);
    expect(result.tasks[0].context).toBeUndefined();
    expect(result.tasks[0].category).toBeUndefined();
  });

  it("parses multiple tasks", () => {
    const text = '{"tasks":[{"name":"Task A","minutes":15},{"name":"Task B","minutes":30}]}';
    const result = parseVoiceResponse(text);
    expect(result.tasks).toHaveLength(2);
  });

  it("returns empty tasks array when tasks is empty", () => {
    const result = parseVoiceResponse('{"tasks":[]}');
    expect(result.tasks).toEqual([]);
  });

  it("throws on invalid JSON", () => {
    expect(() => parseVoiceResponse("not json")).toThrow();
  });

  it("throws when tasks field is missing", () => {
    expect(() => parseVoiceResponse('{"result":[]}')).toThrow(/missing tasks array/);
  });

  it("throws when tasks is not an array", () => {
    expect(() => parseVoiceResponse('{"tasks":"oops"}')).toThrow();
  });
});

// ─── handleRequest ────────────────────────────────────────────────────────────

function makeRequest(body: unknown, headers: Record<string, string> = {}): Request {
  return new Request("http://test/voice-tasks", {
    method: "POST",
    headers: { "Content-Type": "application/json", "Authorization": "Bearer test-token", ...headers },
    body: JSON.stringify(body),
  });
}

function makeDeps(overrides: Partial<Deps> = {}): Deps {
  return {
    requireAuth: vi.fn().mockResolvedValue("user-123"),
    callAnthropic: vi.fn().mockResolvedValue(
      '{"tasks":[{"name":"Write report","minutes":30,"category":"Work"}]}'
    ),
    ...overrides,
  };
}

describe("handleRequest", () => {
  it("responds 200 to OPTIONS (CORS preflight)", async () => {
    const req = new Request("http://test", { method: "OPTIONS" });
    const res = await handleRequest(req, makeDeps());
    expect(res.status).toBe(200);
    expect(res.headers.get("Access-Control-Allow-Origin")).toBe("*");
  });

  it("returns 401 when auth throws", async () => {
    const deps = makeDeps({ requireAuth: vi.fn().mockRejectedValue(new Error("bad token")) });
    const res = await handleRequest(makeRequest({ transcript: "hello" }), deps);
    expect(res.status).toBe(401);
    expect((await res.json()).error).toBe("Unauthorized");
  });

  it("returns 400 for invalid JSON body", async () => {
    const req = new Request("http://test", {
      method: "POST",
      headers: { "Authorization": "Bearer tok" },
      body: "not json >>>",
    });
    const res = await handleRequest(req, makeDeps());
    expect(res.status).toBe(400);
  });

  it("returns 400 when transcript is missing", async () => {
    const res = await handleRequest(makeRequest({}), makeDeps());
    expect(res.status).toBe(400);
    expect((await res.json()).error).toMatch(/transcript/);
  });

  it("returns 400 when transcript is blank whitespace", async () => {
    const res = await handleRequest(makeRequest({ transcript: "   " }), makeDeps());
    expect(res.status).toBe(400);
  });

  it("returns 200 with tasks on a valid transcript", async () => {
    const res = await handleRequest(makeRequest({ transcript: "Write a report" }), makeDeps());
    expect(res.status).toBe(200);
    const body = await res.json();
    expect(Array.isArray(body.tasks)).toBe(true);
    expect(body.tasks[0].name).toBe("Write report");
  });

  it("returns tasks that include context when Anthropic provides it", async () => {
    const withContext = '{"tasks":[{"name":"Prepare deck","minutes":60,"context":"Board meeting Thursday."}]}';
    const deps = makeDeps({ callAnthropic: vi.fn().mockResolvedValue(withContext) });
    const res = await handleRequest(makeRequest({ transcript: "prepare a board deck for thursday" }), deps);
    const body = await res.json();
    expect(body.tasks[0].context).toBe("Board meeting Thursday.");
  });

  it("returns tasks without context when Anthropic omits it", async () => {
    const noContext = '{"tasks":[{"name":"Email Sarah","minutes":10}]}';
    const deps = makeDeps({ callAnthropic: vi.fn().mockResolvedValue(noContext) });
    const res = await handleRequest(makeRequest({ transcript: "email sarah" }), deps);
    const body = await res.json();
    expect(body.tasks[0].context).toBeUndefined();
  });

  it("passes the transcript to Anthropic inside the user message", async () => {
    const callMock = vi.fn().mockResolvedValue('{"tasks":[{"name":"Do thing","minutes":15}]}');
    const deps = makeDeps({ callAnthropic: callMock });
    await handleRequest(makeRequest({ transcript: "review the quarterly numbers" }), deps);
    const calledWith = callMock.mock.calls[0][0];
    expect(calledWith.messages[0].content).toContain("review the quarterly numbers");
  });

  it("returns 502 when Anthropic throws", async () => {
    const deps = makeDeps({ callAnthropic: vi.fn().mockRejectedValue(new Error("timeout")) });
    const res = await handleRequest(makeRequest({ transcript: "do the thing" }), deps);
    expect(res.status).toBe(502);
    expect((await res.json()).error).toBe("timeout");
  });

  it("returns 500 when Anthropic returns non-JSON", async () => {
    const deps = makeDeps({ callAnthropic: vi.fn().mockResolvedValue("Sorry, can't help.") });
    const res = await handleRequest(makeRequest({ transcript: "do the thing" }), deps);
    expect(res.status).toBe(500);
    expect((await res.json()).error).toMatch(/Unexpected response format/);
  });

  it("returns 500 when Anthropic returns JSON without tasks array", async () => {
    const deps = makeDeps({ callAnthropic: vi.fn().mockResolvedValue('{"result":"ok"}') });
    const res = await handleRequest(makeRequest({ transcript: "do the thing" }), deps);
    expect(res.status).toBe(500);
  });
});
