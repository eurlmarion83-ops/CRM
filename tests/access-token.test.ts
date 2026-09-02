import { describe, it, expect } from "vitest";
import { signAppointmentToken, verifyAppointmentToken } from "@/lib/access-token";

describe("access-token", () => {
  it("verifies a token it signed for the same appointment id", () => {
    const token = signAppointmentToken("appt_123");
    expect(verifyAppointmentToken(token)).toBe("appt_123");
  });

  it("rejects a token signed for a different appointment id", () => {
    const token = signAppointmentToken("appt_123");
    expect(verifyAppointmentToken(token.replace("appt_123", "appt_456"))).toBeNull();
  });

  it("rejects a tampered signature", () => {
    const token = signAppointmentToken("appt_123");
    const [id, sig] = token.split(".");
    const tampered = `${id}.${sig.slice(0, -1)}${sig.at(-1) === "a" ? "b" : "a"}`;
    expect(verifyAppointmentToken(tampered)).toBeNull();
  });

  it("rejects malformed tokens", () => {
    expect(verifyAppointmentToken("not-a-token")).toBeNull();
    expect(verifyAppointmentToken("")).toBeNull();
  });
});
