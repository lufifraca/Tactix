import { test } from "node:test";
import assert from "node:assert/strict";
import { hashPassword, verifyPassword } from "./password";

test("hashPassword produces a self-describing scrypt string", () => {
  const h = hashPassword("correct horse battery staple");
  const parts = h.split("$");
  assert.equal(parts.length, 4);
  assert.equal(parts[0], "scrypt");
  assert.ok(Number(parts[1]) >= 2, "cost factor encoded");
  assert.ok(parts[2].length > 0 && parts[3].length > 0, "salt + hash present");
});

test("verifyPassword accepts the correct password", () => {
  const h = hashPassword("s3cret-passw0rd");
  assert.equal(verifyPassword("s3cret-passw0rd", h), true);
});

test("verifyPassword rejects the wrong password", () => {
  const h = hashPassword("s3cret-passw0rd");
  assert.equal(verifyPassword("s3cret-passw0Rd", h), false);
  assert.equal(verifyPassword("", h), false);
});

test("same password hashes differently each time (random salt)", () => {
  const a = hashPassword("repeat-me");
  const b = hashPassword("repeat-me");
  assert.notEqual(a, b);
  // ...but both still verify
  assert.equal(verifyPassword("repeat-me", a), true);
  assert.equal(verifyPassword("repeat-me", b), true);
});

test("verifyPassword is safe against malformed / empty stored hashes", () => {
  assert.equal(verifyPassword("x", null), false);
  assert.equal(verifyPassword("x", undefined), false);
  assert.equal(verifyPassword("x", ""), false);
  assert.equal(verifyPassword("x", "notscrypt$1$2$3"), false);
  assert.equal(verifyPassword("x", "scrypt$bad"), false);
  assert.equal(verifyPassword("x", "scrypt$16384$onlythree"), false);
});

test("verifyPassword rejects a tampered hash segment", () => {
  const h = hashPassword("tamper-test");
  const parts = h.split("$");
  parts[3] = parts[3].slice(0, -2) + (parts[3].endsWith("AA") ? "BB" : "AA");
  assert.equal(verifyPassword("tamper-test", parts.join("$")), false);
});
