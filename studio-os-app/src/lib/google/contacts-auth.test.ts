import { describe, expect, it } from "vitest";
import { parseContactSearchQuery } from "./contacts-auth";

describe("parseContactSearchQuery", () => {
  it("uses plain text as name", () => {
    expect(parseContactSearchQuery("Anne Kopriva")).toEqual({ name: "Anne Kopriva" });
  });

  it("parses email into name and email", () => {
    expect(parseContactSearchQuery("jane.doe@studio.com")).toEqual({
      name: "jane doe",
      email: "jane.doe@studio.com",
    });
  });
});
