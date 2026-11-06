import { format, isSameDay, addDays, differenceInCalendarDays } from "date-fns";
import { enIN } from "date-fns/locale";

export interface AppointmentDateDetails {
  dayNumeral: string;
  weekday: string;
  month: string;
  time: string;
  relativeLabel: string;
  isToday: boolean;
  isTomorrow: boolean;
  fullDateString: string;
}

/**
 * Formats appointment timestamps in English with a 12-hour clock ("4:11 pm").
 */
export function formatAppointmentDate(
  dateInput: Date | string,
  nowInput?: Date | string
): AppointmentDateDetails {
  const date = typeof dateInput === "string" ? new Date(dateInput) : dateInput;
  const now = nowInput ? (typeof nowInput === "string" ? new Date(nowInput) : nowInput) : new Date();

  const dayNumeral = format(date, "d");
  const weekday = format(date, "EEE", { locale: enIN });
  const month = format(date, "MMM", { locale: enIN });

  // 12-hour format in lowercase "4:11 pm"
  const time = format(date, "h:mm a", { locale: enIN }).toLowerCase();

  const isToday = isSameDay(date, now);
  const isTomorrow = isSameDay(date, addDays(now, 1));
  const diffDays = differenceInCalendarDays(date, now);

  let relativeLabel = "";
  if (isToday) {
    relativeLabel = "Today";
  } else if (isTomorrow) {
    relativeLabel = "Tomorrow";
  } else if (diffDays > 1) {
    relativeLabel = `In ${diffDays} days`;
  } else if (diffDays < 0) {
    relativeLabel = "Past";
  }

  const fullDateString = format(date, "d MMM yyyy", { locale: enIN });

  return {
    dayNumeral,
    weekday,
    month,
    time,
    relativeLabel,
    isToday,
    isTomorrow,
    fullDateString,
  };
}

/**
 * Formats lead / enquiry date (e.g., "3 Nov 2026").
 */
export function formatEnquiryDate(dateInput: Date | string): string {
  const date = typeof dateInput === "string" ? new Date(dateInput) : dateInput;
  return format(date, "d MMM yyyy", { locale: enIN });
}
