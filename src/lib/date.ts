import { format, isSameDay, addDays, differenceInCalendarDays } from "date-fns";
import { enIN, hi } from "date-fns/locale";

export function getDateFnsLocale(locale: string) {
  return locale === "hi" ? hi : enIN;
}

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
 * Formats appointment timestamps consistently with active locale and 12-hour format ("4:11 pm").
 */
export function formatAppointmentDate(
  dateInput: Date | string,
  locale: string = "en",
  nowInput?: Date | string
): AppointmentDateDetails {
  const date = typeof dateInput === "string" ? new Date(dateInput) : dateInput;
  const now = nowInput ? (typeof nowInput === "string" ? new Date(nowInput) : nowInput) : new Date();
  const dateLocale = getDateFnsLocale(locale);

  const dayNumeral = format(date, "d");
  const weekday = format(date, "EEE", { locale: dateLocale });
  const month = format(date, "MMM", { locale: dateLocale });

  // 12-hour format in lowercase "4:11 pm"
  let time = format(date, "h:mm a", { locale: dateLocale });
  if (locale !== "hi") {
    time = time.toLowerCase();
  }

  const isToday = isSameDay(date, now);
  const isTomorrow = isSameDay(date, addDays(now, 1));
  const diffDays = differenceInCalendarDays(date, now);

  let relativeLabel = "";
  if (isToday) {
    relativeLabel = locale === "hi" ? "आज" : "Today";
  } else if (isTomorrow) {
    relativeLabel = locale === "hi" ? "कल" : "Tomorrow";
  } else if (diffDays > 1) {
    relativeLabel = locale === "hi" ? `${diffDays} दिनों में` : `In ${diffDays} days`;
  } else if (diffDays < 0) {
    relativeLabel = locale === "hi" ? "बीत चुका" : "Past";
  }

  const fullDateString = format(date, "d MMM yyyy", { locale: dateLocale });

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
 * Formats lead / enquiry date (e.g., "3 Nov 2026" / "3 नवं 2026").
 */
export function formatEnquiryDate(dateInput: Date | string, locale: string = "en"): string {
  const date = typeof dateInput === "string" ? new Date(dateInput) : dateInput;
  const dateLocale = getDateFnsLocale(locale);
  return format(date, "d MMM yyyy", { locale: dateLocale });
}

