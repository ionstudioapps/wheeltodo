import { describe, it, expect, beforeEach, afterEach, vi } from "vitest";
import { buildGcalEvent } from "./gcal-events.ts";

// buildGcalEvent is a pure function — no Deno APIs, fully testable

describe("buildGcalEvent", () => {
  const TASK_ID   = "task-abc-123";
  const TASK_NAME = "Prepare Q2 presentation";
  const MINUTES   = 60;

  // ── timed events ───────────────────────────────────────────────────────────

  describe("timed event (scheduledAt provided)", () => {
    const scheduledAt = "2026-05-30T14:00:00.000Z";

    it("uses dateTime (not date) for start and end", () => {
      const ev = buildGcalEvent({ id: TASK_ID, name: TASK_NAME, minutes: MINUTES, scheduledAt });
      expect(ev.start.dateTime).toBeDefined();
      expect(ev.start.date).toBeUndefined();
      expect(ev.end.dateTime).toBeDefined();
      expect(ev.end.date).toBeUndefined();
    });

    it("sets end time to start + task minutes", () => {
      const ev = buildGcalEvent({ id: TASK_ID, name: TASK_NAME, minutes: MINUTES, scheduledAt });
      const startMs = new Date(ev.start.dateTime!).getTime();
      const endMs   = new Date(ev.end.dateTime!).getTime();
      expect((endMs - startMs) / 60_000).toBe(MINUTES);
    });

    it("start dateTime matches scheduledAt", () => {
      const ev = buildGcalEvent({ id: TASK_ID, name: TASK_NAME, minutes: MINUTES, scheduledAt });
      expect(new Date(ev.start.dateTime!).toISOString()).toBe(new Date(scheduledAt).toISOString());
    });

    it("sets timeZone to UTC", () => {
      const ev = buildGcalEvent({ id: TASK_ID, name: TASK_NAME, minutes: MINUTES, scheduledAt });
      expect(ev.start.timeZone).toBe("UTC");
      expect(ev.end.timeZone).toBe("UTC");
    });
  });

  // ── all-day events ─────────────────────────────────────────────────────────

  describe("all-day event (no scheduledAt)", () => {
    beforeEach(() => {
      // Pin "today" so the test is deterministic
      vi.useFakeTimers();
      vi.setSystemTime(new Date("2026-05-30T10:00:00.000Z"));
    });
    afterEach(() => vi.useRealTimers());

    it("uses date (not dateTime) for start and end", () => {
      const ev = buildGcalEvent({ id: TASK_ID, name: TASK_NAME, minutes: MINUTES });
      expect(ev.start.date).toBeDefined();
      expect(ev.start.dateTime).toBeUndefined();
      expect(ev.end.date).toBeDefined();
      expect(ev.end.dateTime).toBeUndefined();
    });

    it("sets date to today's ISO date", () => {
      const ev = buildGcalEvent({ id: TASK_ID, name: TASK_NAME, minutes: MINUTES });
      expect(ev.start.date).toBe("2026-05-30");
      expect(ev.end.date).toBe("2026-05-30");
    });
  });

  // ── shared fields ──────────────────────────────────────────────────────────

  it("sets summary to task name", () => {
    const ev = buildGcalEvent({ id: TASK_ID, name: TASK_NAME, minutes: MINUTES });
    expect(ev.summary).toBe(TASK_NAME);
  });

  it("includes estimated minutes in description", () => {
    const ev = buildGcalEvent({ id: TASK_ID, name: TASK_NAME, minutes: MINUTES });
    expect(ev.description).toContain("60 min");
  });

  it("stores task id in extendedProperties.private", () => {
    const ev = buildGcalEvent({ id: TASK_ID, name: TASK_NAME, minutes: MINUTES });
    expect(ev.extendedProperties?.private?.wheeltodo_task_id).toBe(TASK_ID);
  });

  it("different task ids produce different extendedProperties values", () => {
    const ev1 = buildGcalEvent({ id: "id-1", name: "Task 1", minutes: 30 });
    const ev2 = buildGcalEvent({ id: "id-2", name: "Task 2", minutes: 30 });
    expect(ev1.extendedProperties?.private?.wheeltodo_task_id).toBe("id-1");
    expect(ev2.extendedProperties?.private?.wheeltodo_task_id).toBe("id-2");
  });
});
