import { describe, it, expect } from "vitest";
import { hashPassword, verifyPassword, generateSessionToken } from "./crypto.js";

describe("hashPassword and verifyPassword", () => {
  it("hashes a password and verifies it correctly", async () => {
    const hash = await hashPassword("test-password-123");
    expect(hash).toContain(":");
    const [salt, key] = hash.split(":");
    expect(salt).toHaveLength(64);
    expect(key).toHaveLength(128);
    const valid = await verifyPassword("test-password-123", hash);
    expect(valid).toBe(true);
  });

  it("rejects incorrect password", async () => {
    const hash = await hashPassword("correct-password");
    const valid = await verifyPassword("wrong-password", hash);
    expect(valid).toBe(false);
  });

  it("produces different hashes for the same password", async () => {
    const hash1 = await hashPassword("same-password");
    const hash2 = await hashPassword("same-password");
    expect(hash1).not.toBe(hash2);
  });

  it("rejects malformed hash", async () => {
    const valid = await verifyPassword("password", "invalid-hash");
    expect(valid).toBe(false);
  });
});

describe("generateSessionToken", () => {
  it("generates a non-empty hex string", () => {
    const token = generateSessionToken();
    expect(token).toBeTruthy();
    expect(token.length).toBe(64);
  });

  it("generates unique tokens", () => {
    const token1 = generateSessionToken();
    const token2 = generateSessionToken();
    expect(token1).not.toBe(token2);
  });
});
