import { describe, it, expect } from "vitest";
import { formatAppointmentDate, formatEnquiryDate } from "@/lib/date";

describe("date formatting with locale", () => {
  const refDate = new Date("2026-11-04T16:11:00+05:30");
  const nowDate = new Date("2026-11-03T10:00:00+05:30");

  it("formats appointment in English with 12-hour lowercase time", () => {
    const res = formatAppointmentDate(refDate, "en", nowDate);
    expect(res.dayNumeral).toBe("4");
    expect(res.month).toBe("Nov");
    expect(res.weekday).toBe("Wed");
    expect(res.time).toBe("4:11 pm");
    expect(res.relativeLabel).toBe("Tomorrow");
    expect(res.isTomorrow).toBe(true);
  });

  it("formats appointment in Hindi with authentic names", () => {
    const res = formatAppointmentDate(refDate, "hi", nowDate);
    expect(res.dayNumeral).toBe("4");
    expect(res.weekday).toBe("बुध");
    expect(res.month).toBe("नव");
    expect(res.relativeLabel).toBe("कल");
  });

  it("formats relative days correctly for Today and future dates", () => {
    const today = formatAppointmentDate(nowDate, "en", nowDate);
    expect(today.relativeLabel).toBe("Today");
    expect(today.isToday).toBe(true);

    const in3Days = formatAppointmentDate("2026-11-06T14:00:00+05:30", "en", nowDate);
    expect(in3Days.relativeLabel).toBe("In 3 days");
  });

  it("formats enquiry date correctly in en and hi", () => {
    expect(formatEnquiryDate("2026-11-03T16:20:00+05:30", "en")).toBe("3 Nov 2026");
    expect(formatEnquiryDate("2026-11-03T16:20:00+05:30", "hi")).toBe("3 नव 2026");
  });
});
