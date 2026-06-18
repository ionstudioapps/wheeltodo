import { describe, it, expect } from "vitest";
import { TaskSchema } from "../index.ts";

const VALID: Parameters<typeof TaskSchema.parse>[0] = {
  id: "task-1",
  name: "Write report",
  minutes: 30,
  color: "#EDB590",
  icon: "📝",
};

describe("TaskSchema", () => {
  it("accepts a valid task", () => {
    expect(() => TaskSchema.parse(VALID)).not.toThrow();
  });

  it("rejects empty name", () => {
    expect(() => TaskSchema.parse({ ...VALID, name: "" })).toThrow();
  });

  it("rejects name over 120 characters", () => {
    expect(() => TaskSchema.parse({ ...VALID, name: "a".repeat(121) })).toThrow();
  });

  it("accepts name exactly 120 characters", () => {
    expect(() => TaskSchema.parse({ ...VALID, name: "a".repeat(120) })).not.toThrow();
  });

  it("rejects minutes below 1", () => {
    expect(() => TaskSchema.parse({ ...VALID, minutes: 0 })).toThrow();
  });

  it("rejects minutes above 480", () => {
    expect(() => TaskSchema.parse({ ...VALID, minutes: 481 })).toThrow();
  });

  it("accepts minutes at the boundaries (1 and 480)", () => {
    expect(() => TaskSchema.parse({ ...VALID, minutes: 1 })).not.toThrow();
    expect(() => TaskSchema.parse({ ...VALID, minutes: 480 })).not.toThrow();
  });

  it("rejects non-integer minutes", () => {
    expect(() => TaskSchema.parse({ ...VALID, minutes: 30.5 })).toThrow();
  });

  it("rejects missing required fields", () => {
    const { id: _id, ...withoutId } = VALID;
    expect(() => TaskSchema.parse(withoutId)).toThrow();
    const { name: _name, ...withoutName } = VALID;
    expect(() => TaskSchema.parse(withoutName)).toThrow();
  });
});
