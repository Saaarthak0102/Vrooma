import { describe, it, expect } from "vitest";
import { slaState, formatSeconds } from "../src/lib/sla";

describe("SLA state calculation", () => {
  const baseTime = new Date("2026-06-15T10:00:00.000Z");
  const dueAt = new Date("2026-06-15T10:05:00.000Z"); // 5 min SLA

  it("returns 'ok' (green) when more than 2 minutes remain", () => {
    // 3 minutes remaining
    const now = new Date("2026-06-15T10:02:00.000Z");
    const result = slaState(dueAt, null, now);
    expect(result.state).toBe("ok");
    expect(result.isBreached).toBe(false);
    expect(result.remainingSeconds).toBe(180);
    expect(result.label).toBe("3:00 left");
  });

  it("returns 'warn' (amber) when 2 minutes or less remain", () => {
    // 90 seconds remaining
    const now = new Date("2026-06-15T10:03:30.000Z");
    const result = slaState(dueAt, null, now);
    expect(result.state).toBe("warn");
    expect(result.isBreached).toBe(false);
    expect(result.remainingSeconds).toBe(90);
    expect(result.label).toBe("1:30 left");
  });

  it("returns 'breached' (red) when time expires without contact", () => {
    // 30 seconds after due date
    const now = new Date("2026-06-15T10:05:30.000Z");
    const result = slaState(dueAt, null, now);
    expect(result.state).toBe("breached");
    expect(result.isBreached).toBe(true);
    expect(result.remainingSeconds).toBe(-30);
    expect(result.label).toContain("Breached by 0:30");
  });

  it("returns 'met' when contact occurred within the 5 minute window", () => {
    const contactedAt = new Date("2026-06-15T10:03:00.000Z");
    const now = new Date("2026-06-15T10:10:00.000Z");
    const result = slaState(dueAt, contactedAt, now);
    expect(result.state).toBe("met");
    expect(result.isBreached).toBe(false);
  });

  it("returns 'breached' if contact occurred after due date", () => {
    const contactedAt = new Date("2026-06-15T10:06:00.000Z");
    const now = new Date("2026-06-15T10:10:00.000Z");
    const result = slaState(dueAt, contactedAt, now);
    expect(result.state).toBe("breached");
    expect(result.isBreached).toBe(true);
  });

  it("formats seconds to mm:ss correctly", () => {
    expect(formatSeconds(300)).toBe("5:00");
    expect(formatSeconds(45)).toBe("0:45");
    expect(formatSeconds(5)).toBe("0:05");
  });
});

