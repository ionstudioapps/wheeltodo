import { describe, it, expect } from "vitest";
import {
  ACHIEVEMENT_DEFS,
  getNextAchievement,
  getUnlockedTierIds,
  type AchievementValues,
} from "../achievements.ts";

const ZERO: AchievementValues = { streak: 0, tasks: 0, focus: 0, speed: 0, rest: 0, spin: 0 };
const ALL_MAX: AchievementValues = { streak: 200, tasks: 200, focus: 9999, speed: 100, rest: 100, spin: 100 };

// ─── getUnlockedTierIds ───────────────────────────────────────────────────────

describe("getUnlockedTierIds", () => {
  it("returns empty array when all values are zero", () => {
    expect(getUnlockedTierIds(ZERO)).toEqual([]);
  });

  it("unlocks first tier when exactly at target", () => {
    const ids = getUnlockedTierIds({ ...ZERO, streak: 3 });
    expect(ids).toContain("streak_3");
    expect(ids).not.toContain("streak_7");
  });

  it("unlocks multiple streak tiers when past several targets", () => {
    const ids = getUnlockedTierIds({ ...ZERO, streak: 30 });
    expect(ids).toContain("streak_3");
    expect(ids).toContain("streak_7");
    expect(ids).toContain("streak_30");
    expect(ids).not.toContain("streak_100");
  });

  it("unlocks all tiers when all values are at max", () => {
    const ids = getUnlockedTierIds(ALL_MAX);
    const allTierIds = ACHIEVEMENT_DEFS.flatMap((d) => d.tiers.map((t) => t.id));
    for (const id of allTierIds) {
      expect(ids).toContain(id);
    }
  });

  it("unlocks only completed tiers for tasks_1 and tasks_10 at value 10", () => {
    const ids = getUnlockedTierIds({ ...ZERO, tasks: 10 });
    expect(ids).toContain("tasks_1");
    expect(ids).toContain("tasks_10");
    expect(ids).not.toContain("tasks_50");
    expect(ids).not.toContain("tasks_100");
  });
});

// ─── getNextAchievement ───────────────────────────────────────────────────────

describe("getNextAchievement", () => {
  it("returns null when all tiers are complete", () => {
    expect(getNextAchievement(ALL_MAX)).toBeNull();
  });

  it("returns a result when there are tiers remaining", () => {
    const next = getNextAchievement(ZERO);
    expect(next).not.toBeNull();
    expect(next!.def).toBeDefined();
    expect(next!.tier).toBeDefined();
  });

  it("picks the tier with the highest completion percentage", () => {
    // tasks: 9/10 = 90%, streak: 0/3 = 0%
    // should pick tasks_10 as the closest
    const next = getNextAchievement({ ...ZERO, tasks: 9 });
    expect(next!.tier.id).toBe("tasks_10");
    expect(next!.current).toBe(9);
    expect(next!.pct).toBeCloseTo(0.9);
  });

  it("skips already-completed tiers", () => {
    // streak 7 already done; next should be streak_30
    const next = getNextAchievement({ ...ZERO, streak: 7 });
    expect(next!.tier.id).not.toBe("streak_3");
    expect(next!.tier.id).not.toBe("streak_7");
    // streak_30 at 7/30 ≈ 23% — but rest/tasks/focus etc. are at 0%,
    // so if another key has a closer first tier pick that
    const pct = next!.pct;
    expect(pct).toBeGreaterThan(0);
  });

  it("returns correct def and tier references", () => {
    const next = getNextAchievement({ ...ZERO, spin: 1 });
    // spin_1 complete → next should be spin_10
    const spinDef = ACHIEVEMENT_DEFS.find((d) => d.key === "spin")!;
    expect(next!.def.key).toBe("spin");
    expect(next!.tier.id).toBe("spin_10");
    expect(next!.def).toBe(spinDef);
  });
});

// ─── ACHIEVEMENT_DEFS shape ───────────────────────────────────────────────────

describe("ACHIEVEMENT_DEFS", () => {
  it("every def has at least one tier", () => {
    for (const def of ACHIEVEMENT_DEFS) {
      expect(def.tiers.length, `${def.key} should have tiers`).toBeGreaterThan(0);
    }
  });

  it("tier targets are in ascending order within each def", () => {
    for (const def of ACHIEVEMENT_DEFS) {
      for (let i = 1; i < def.tiers.length; i++) {
        expect(def.tiers[i].target, `${def.key} tier ${i} target`).toBeGreaterThan(
          def.tiers[i - 1].target
        );
      }
    }
  });

  it("description function returns a non-empty string", () => {
    for (const def of ACHIEVEMENT_DEFS) {
      expect(def.description(5)).toBeTruthy();
      expect(def.description(1)).toBeTruthy();
    }
  });
});
