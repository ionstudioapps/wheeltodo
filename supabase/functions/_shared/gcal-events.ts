// Pure GCal event helpers — no external imports so this file is Vitest-testable.

export interface GcalEvent {
  id?: string;
  summary: string;
  description?: string;
  start: { dateTime?: string; date?: string; timeZone?: string };
  end:   { dateTime?: string; date?: string; timeZone?: string };
  extendedProperties?: {
    private?: Record<string, string>;
  };
}

const WHEELTODO_TAG = "wheeltodo_task_id";

export function buildGcalEvent(task: {
  id: string;
  name: string;
  minutes: number;
  scheduledAt?: string;
}): GcalEvent {
  if (task.scheduledAt) {
    const start = new Date(task.scheduledAt);
    const end   = new Date(start.getTime() + task.minutes * 60_000);
    return {
      summary:     task.name,
      description: `WheelTodo task · estimated ${task.minutes} min`,
      start: { dateTime: start.toISOString(), timeZone: "UTC" },
      end:   { dateTime: end.toISOString(),   timeZone: "UTC" },
      extendedProperties: { private: { [WHEELTODO_TAG]: task.id } },
    };
  }

  const today = new Date().toISOString().slice(0, 10);
  return {
    summary:     task.name,
    description: `WheelTodo task · estimated ${task.minutes} min`,
    start: { date: today },
    end:   { date: today },
    extendedProperties: { private: { [WHEELTODO_TAG]: task.id } },
  };
}
