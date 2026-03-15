
import { describe, it, expect } from "vitest";
import { openclaw } from "../openclaw";

describe("openclaw", () => {
  it("should be a function", () => {
    expect(typeof openclaw).toBe("function");
  });
});
