import { describe, it, expect, vi } from "vitest";
import { buildMessages, parseResponse, handleRequest, type Deps } from "./logic.ts";

// ─── buildMessages ────────────────────────────────────────────────────────────

describe("buildMessages", () => {
  it("wraps task into a single user message when no history", () => {
    const msgs = buildMessages("Write a report", 30, []);
    expect(msgs).toHaveLength(1);
    expect(msgs[0].role).toBe("user");
    expect(msgs[0].content).toContain("Write a report");
    expect(msgs[0].content).toContain("30 minutes");
  });

  it("shows ? for minutes when taskMinutes is undefined", () => {
    const msgs = buildMessages("Do the thing", undefined as unknown as number, []);
    expect(msgs[0].content).toContain("? minutes");
  });

  it("passes history through unchanged when provided", () => {
    const history = [
      { role: "user" as const, content: "Task: blah (30 min)" },
      { role: "assistant" as const, content: '{"type":"question","question":"What kind?"}' },
      { role: "user" as const, content: "A client pitch" },
    ];
    const msgs = buildMessages("blah", 30, history);
    expect(msgs).toBe(history);
    expect(msgs).toHaveLength(3);
  });

  it("includes context in the first message when provided", () => {
    const msgs = buildMessages("Prepare presentation", 60, [], "For the product team on Friday. Needs metrics and a live demo.");
    expect(msgs).toHaveLength(1);
    expect(msgs[0].content).toContain("Context:");
    expect(msgs[0].content).toContain("product team");
    expect(msgs[0].content).toContain("live demo");
  });

  it("omits context line when context is empty or whitespace", () => {
    const msgs = buildMessages("Write a report", 30, [], "   ");
    expect(msgs[0].content).not.toContain("Context:");
  });

  it("omits context line when context is undefined", () => {
    const msgs = buildMessages("Write a report", 30, [], undefined);
    expect(msgs[0].content).not.toContain("Context:");
  });

  it("ignores context when history is provided (history takes priority)", () => {
    const history = [{ role: "user" as const, content: "already started" }];
    const msgs = buildMessages("task", 30, history, "some context");
    expect(msgs).toBe(history);
  });
});

// ─── parseResponse ────────────────────────────────────────────────────────────

describe("parseResponse", () => {
  it("parses a valid question response", () => {
    const text = '{"type":"question","question":"What kind of meeting is it?"}';
    const result = parseResponse(text);
    expect(result.type).toBe("question");
    if (result.type === "question") {
      expect(result.question).toBe("What kind of meeting is it?");
    }
  });

  it("parses a valid subtasks response", () => {
    const text = '{"type":"subtasks","subtasks":[{"name":"Draft outline","minutes":15},{"name":"Write content","minutes":45}]}';
    const result = parseResponse(text);
    expect(result.type).toBe("subtasks");
    if (result.type === "subtasks") {
      expect(result.subtasks).toHaveLength(2);
      expect(result.subtasks[0].name).toBe("Draft outline");
      expect(result.subtasks[1].minutes).toBe(45);
    }
  });

  it("throws on invalid JSON", () => {
    expect(() => parseResponse("not json")).toThrow();
  });

  it("throws on unknown type", () => {
    expect(() => parseResponse('{"type":"something_else"}')).toThrow(/Unexpected response type/);
  });

  it("throws on empty object", () => {
    expect(() => parseResponse("{}")).toThrow();
  });
});

// ─── handleRequest ────────────────────────────────────────────────────────────

function makeRequest(body: unknown, headers: Record<string, string> = {}): Request {
  return new Request("http://test/break-task", {
    method: "POST",
    headers: { "Content-Type": "application/json", "Authorization": "Bearer test-token", ...headers },
    body: JSON.stringify(body),
  });
}

function makeDeps(overrides: Partial<Deps> = {}): Deps {
  return {
    requireAuth: vi.fn().mockResolvedValue("user-123"),
    callAnthropic: vi.fn().mockResolvedValue(
      '{"type":"subtasks","subtasks":[{"name":"Do step 1","minutes":10}]}'
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
    const deps = makeDeps({
      requireAuth: vi.fn().mockRejectedValue(new Error("bad token")),
    });
    const res = await handleRequest(makeRequest({ taskName: "Write report", taskMinutes: 30 }), deps);
    expect(res.status).toBe(401);
    const body = await res.json();
    expect(body.error).toBe("Unauthorized");
  });

  it("returns 400 when request body is not JSON", async () => {
    const req = new Request("http://test", {
      method: "POST",
      headers: { "Authorization": "Bearer tok" },
      body: "not json >>>",
    });
    const res = await handleRequest(req, makeDeps());
    expect(res.status).toBe(400);
  });

  it("returns 400 when taskName is missing", async () => {
    const res = await handleRequest(makeRequest({ taskMinutes: 30 }), makeDeps());
    expect(res.status).toBe(400);
    const body = await res.json();
    expect(body.error).toMatch(/taskName/);
  });

  it("returns 400 when taskName is blank whitespace", async () => {
    const res = await handleRequest(makeRequest({ taskName: "   ", taskMinutes: 30 }), makeDeps());
    expect(res.status).toBe(400);
  });

  it("returns 200 with subtasks when Anthropic returns subtasks", async () => {
    const subtasksJson = '{"type":"subtasks","subtasks":[{"name":"Draft outline","minutes":15},{"name":"Write content","minutes":45}]}';
    const deps = makeDeps({ callAnthropic: vi.fn().mockResolvedValue(subtasksJson) });
    const res = await handleRequest(makeRequest({ taskName: "Write report", taskMinutes: 60 }), deps);
    expect(res.status).toBe(200);
    const body = await res.json();
    expect(body.type).toBe("subtasks");
    expect(body.subtasks).toHaveLength(2);
  });

  it("returns 200 with question when Anthropic asks for clarification", async () => {
    const questionJson = '{"type":"question","question":"Is this for internal or external stakeholders?"}';
    const deps = makeDeps({ callAnthropic: vi.fn().mockResolvedValue(questionJson) });
    const res = await handleRequest(makeRequest({ taskName: "Prepare", taskMinutes: 60 }), deps);
    expect(res.status).toBe(200);
    const body = await res.json();
    expect(body.type).toBe("question");
    expect(body.question).toContain("stakeholders");
  });

  it("includes context in the Anthropic message when provided", async () => {
    const callMock = vi.fn().mockResolvedValue('{"type":"subtasks","subtasks":[{"name":"Step","minutes":10}]}');
    const deps = makeDeps({ callAnthropic: callMock });
    await handleRequest(
      makeRequest({ taskName: "Prepare presentation", taskMinutes: 60, context: "Client pitch on Friday" }),
      deps,
    );
    const calledWith = callMock.mock.calls[0][0];
    expect(calledWith.messages[0].content).toContain("Context:");
    expect(calledWith.messages[0].content).toContain("Client pitch on Friday");
  });

  it("passes history to Anthropic when provided", async () => {
    const callMock = vi.fn().mockResolvedValue('{"type":"subtasks","subtasks":[{"name":"Step","minutes":10}]}');
    const deps = makeDeps({ callAnthropic: callMock });
    const history = [
      { role: "user" as const, content: 'Task: "Prepare" (60 min)' },
      { role: "assistant" as const, content: '{"type":"question","question":"What kind?"}' },
      { role: "user" as const, content: "A client pitch deck" },
    ];
    await handleRequest(makeRequest({ taskName: "Prepare", taskMinutes: 60, history }), deps);
    const calledWith = callMock.mock.calls[0][0];
    expect(calledWith.messages).toEqual(history);
  });

  it("returns 502 when Anthropic throws", async () => {
    const deps = makeDeps({
      callAnthropic: vi.fn().mockRejectedValue(new Error("API timeout")),
    });
    const res = await handleRequest(makeRequest({ taskName: "Write report", taskMinutes: 30 }), deps);
    expect(res.status).toBe(502);
    const body = await res.json();
    expect(body.error).toBe("API timeout");
  });

  it("returns 500 when Anthropic returns non-JSON", async () => {
    const deps = makeDeps({
      callAnthropic: vi.fn().mockResolvedValue("Sorry, I can't help with that."),
    });
    const res = await handleRequest(makeRequest({ taskName: "Write report", taskMinutes: 30 }), deps);
    expect(res.status).toBe(500);
    const body = await res.json();
    expect(body.error).toMatch(/Unexpected response format/);
  });

  it("returns 500 when Anthropic returns an unknown type", async () => {
    const deps = makeDeps({
      callAnthropic: vi.fn().mockResolvedValue('{"type":"unknown_field"}'),
    });
    const res = await handleRequest(makeRequest({ taskName: "Write report", taskMinutes: 30 }), deps);
    expect(res.status).toBe(500);
  });
});
