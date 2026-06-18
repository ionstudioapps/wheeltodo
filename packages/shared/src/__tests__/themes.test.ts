import { describe, it, expect } from "vitest";
import { PALETTE, THEMES, DEFAULT_THEME, type ThemeName } from "../themes.ts";

const THEME_NAMES: ThemeName[] = ["warm-start", "slow-down", "light-a11y", "dark-a11y"];

describe("PALETTE", () => {
  it("defines all 9 brand colors", () => {
    const expected = ["peach", "coral", "honey", "sage", "mint", "lavender", "lilac", "blush", "ink"];
    expect(Object.keys(PALETTE)).toEqual(expected);
  });

  it("all palette values are valid hex codes", () => {
    for (const [name, hex] of Object.entries(PALETTE)) {
      expect(hex, `${name} should be a valid hex`).toMatch(/^#[0-9A-Fa-f]{6}$/);
    }
  });
});

describe("THEMES", () => {
  it("has exactly 4 themes", () => {
    expect(Object.keys(THEMES)).toHaveLength(4);
  });

  it("DEFAULT_THEME is a valid theme key", () => {
    expect(THEMES[DEFAULT_THEME]).toBeDefined();
  });

  for (const name of THEME_NAMES) {
    describe(name, () => {
      it("name field matches its key", () => {
        expect(THEMES[name].name).toBe(name);
      });

      it("has exactly 8 wheel colors", () => {
        expect(THEMES[name].colors.wheel).toHaveLength(8);
      });

      it("has exactly 8 wheelLight colors", () => {
        expect(THEMES[name].colors.wheelLight).toHaveLength(8);
      });

      it("wheel colors are valid hex codes", () => {
        for (const hex of THEMES[name].colors.wheel) {
          expect(hex).toMatch(/^#[0-9A-Fa-f]{6}$/);
        }
      });

      it("has required color keys", () => {
        const c = THEMES[name].colors;
        const required = [
          "bgScreen", "bgCard", "bgInput",
          "textPrimary", "textSecondary", "textMuted",
          "accent", "primary", "success", "danger",
        ];
        for (const key of required) {
          expect(c[key as keyof typeof c], `${name}.${key}`).toBeTruthy();
        }
      });

      it("has all 5 rest category colors", () => {
        const rest = THEMES[name].colors.rest;
        expect(Object.keys(rest)).toEqual(["physical", "mental", "social", "nourishment", "custom"]);
        for (const [cat, hex] of Object.entries(rest)) {
          expect(hex, `${name}.rest.${cat}`).toMatch(/^#[0-9A-Fa-f]{6}$/);
        }
      });
    });
  }

  it("warm-start and light-a11y are light themes", () => {
    expect(THEMES["warm-start"].dark).toBe(false);
    expect(THEMES["light-a11y"].dark).toBe(false);
  });

  it("slow-down and dark-a11y are dark themes", () => {
    expect(THEMES["slow-down"].dark).toBe(true);
    expect(THEMES["dark-a11y"].dark).toBe(true);
  });

  it("light-a11y label is 'Gentle Boost'", () => {
    expect(THEMES["light-a11y"].label).toBe("Gentle Boost");
  });

  it("dark-a11y label is 'Grounding Mode'", () => {
    expect(THEMES["dark-a11y"].label).toBe("Grounding Mode");
  });
});
