import { describe, expect, it } from "vitest";
import { parseEnv, AUTH_REQUIRED_ENV } from "@/lib/env";

describe("parseEnv", () => {
  it("flags required auth vars as missing when unset", () => {
    const parsed = parseEnv({});
    expect(parsed.issues.some((i) => i.varName === "DATABASE_URL" && i.reason === "missing")).toBe(true);
    expect(parsed.issues.some((i) => i.varName === "BETTER_AUTH_SECRET" && i.reason === "missing")).toBe(true);
    for (const key of AUTH_REQUIRED_ENV) {
      expect(parsed.values[key]).toBeUndefined();
    }
  });

  it("accepts a well-formed required set", () => {
    const parsed = parseEnv({
      DATABASE_URL: "postgresql://user:pass@localhost:5432/db",
      BETTER_AUTH_SECRET: "x".repeat(64),
    });
    expect(parsed.values.DATABASE_URL).toBe("postgresql://user:pass@localhost:5432/db");
    expect(parsed.values.BETTER_AUTH_SECRET).toBe("x".repeat(64));
    expect(parsed.issues.filter((i) => AUTH_REQUIRED_ENV.includes(i.varName))).toHaveLength(0);
  });

  it("rejects a too-short auth secret", () => {
    const parsed = parseEnv({ BETTER_AUTH_SECRET: "short" });
    const issue = parsed.issues.find((i) => i.varName === "BETTER_AUTH_SECRET");
    expect(issue?.reason).toBe("invalid");
    expect(parsed.values.BETTER_AUTH_SECRET).toBeUndefined();
  });

  it("rejects a malformed base URL", () => {
    const parsed = parseEnv({ BETTER_AUTH_URL: "not-a-url" });
    const issue = parsed.issues.find((i) => i.varName === "BETTER_AUTH_URL");
    expect(issue?.reason).toBe("invalid");
  });

  it("treats empty string the same as missing", () => {
    const parsed = parseEnv({ OPENAI_API_KEY: "" });
    expect(parsed.values.OPENAI_API_KEY).toBeUndefined();
  });
});
