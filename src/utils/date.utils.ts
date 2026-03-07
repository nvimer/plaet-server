import moment from "moment-timezone";

const COLOMBIA_TZ = "America/Bogota";

/**
 * Returns the start of the current day in Colombia as a Date object.
 * This is the reliable way to get "today" for database queries.
 */
export const startOfTodayInColombia = (): Date => {
  return moment().tz(COLOMBIA_TZ).startOf("day").toDate();
};

/**
 * Returns the start of a given date in Colombia TZ.
 * @param date - Date string (YYYY-MM-DD) or Date object
 */
export const startOfDayInColombia = (date: string | Date): Date => {
  return moment.tz(date, COLOMBIA_TZ).startOf("day").toDate();
};

/**
 * Returns the start and end of a given date in Colombia TZ as UTC Dates for Prisma.
 */
export const getColombiaDayRange = (date: string | Date): { start: Date; end: Date } => {
  const m = moment.tz(date, COLOMBIA_TZ).startOf("day");
  return {
    start: m.toDate(),
    end: m.clone().endOf("day").toDate(),
  };
};

/**
 * Formats a date to YYYY-MM-DD in Colombia timezone.
 */
export const formatToColombiaDate = (date: Date | string): string => {
  return moment.tz(date, COLOMBIA_TZ).format("YYYY-MM-DD");
};

/**
 * Checks if a date is "today" in Colombia.
 */
export const isTodayInColombia = (date: Date | string): boolean => {
  const today = moment().tz(COLOMBIA_TZ).format("YYYY-MM-DD");
  const compare = moment.tz(date, COLOMBIA_TZ).format("YYYY-MM-DD");
  return today === compare;
};
