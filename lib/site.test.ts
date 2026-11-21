import { describe, expect, it } from "vitest";
import { DEMO_BANNER_TEXT, SITE_NAME } from "./site";

describe("site settings", () => {
  it("uses the exact demo banner text from the spec", () => {
    expect(DEMO_BANNER_TEXT).toBe("Wersja demonstracyjna. Płatności są testowe.");
  });

  it("never uses the forbidden word in the site name", () => {
    expect(SITE_NAME.toLowerCase()).not.toContain("bolt");
  });
});
