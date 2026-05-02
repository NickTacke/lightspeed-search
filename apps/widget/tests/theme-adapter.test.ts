import { afterEach, beforeAll, describe, expect, test } from "bun:test";
import { GlobalRegistrator } from "@happy-dom/global-registrator";
import { applyTheme, readHostTheme } from "../src/core/theme-adapter.ts";

beforeAll(() => {
  GlobalRegistrator.register();
});

afterEach(() => {
  document.documentElement.style.cssText = "";
});

describe("readHostTheme", () => {
  test("returns nulls when no host vars set", () => {
    const theme = readHostTheme();
    expect(theme.accentColor).toBeNull();
    expect(theme.borderRadius).toBeNull();
  });

  test("reads --aidey-accent if present", () => {
    document.documentElement.style.setProperty("--aidey-accent", "#ff5722");
    const theme = readHostTheme();
    expect(theme.accentColor).toBe("#ff5722");
  });

  test("falls back to --accent when --aidey-accent is missing", () => {
    document.documentElement.style.setProperty("--accent", "blue");
    const theme = readHostTheme();
    expect(theme.accentColor).toBe("blue");
  });
});

describe("applyTheme", () => {
  test("sets only the keys provided (skips nulls)", () => {
    const target = document.createElement("div");
    applyTheme(target, { accentColor: "#abcdef", borderRadius: null, fontFamily: null });
    expect(target.style.getPropertyValue("--aidey-accent")).toBe("#abcdef");
    expect(target.style.getPropertyValue("--aidey-radius")).toBe("");
  });
});
