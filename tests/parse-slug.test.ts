import { describe, it, expect } from "vitest";
import { parseSlug } from "../src/tools/get-company-info.js";

describe("parseSlug", () => {
  it("returns slug as-is", () => {
    expect(parseSlug("myshop")).toBe("myshop");
  });

  it("strips https URL", () => {
    expect(parseSlug("https://noona.app/myshop")).toBe("myshop");
  });

  it("strips http URL", () => {
    expect(parseSlug("http://noona.app/myshop")).toBe("myshop");
  });

  it("strips www prefix", () => {
    expect(parseSlug("www.noona.app/myshop")).toBe("myshop");
  });

  it("strips locale prefix", () => {
    expect(parseSlug("https://noona.app/cs/myshop")).toBe("myshop");
  });

  it("strips trailing slash", () => {
    expect(parseSlug("https://noona.app/myshop/")).toBe("myshop");
  });

  it("strips query params", () => {
    expect(parseSlug("https://noona.app/myshop?ref=123")).toBe("myshop");
  });

  it("strips hash fragment", () => {
    expect(parseSlug("https://noona.app/myshop#section")).toBe("myshop");
  });

  it("trims whitespace", () => {
    expect(parseSlug("  myshop  ")).toBe("myshop");
  });

  it("returns empty string for empty input", () => {
    expect(parseSlug("")).toBe("");
  });
});
