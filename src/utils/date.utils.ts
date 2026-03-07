import moment from "moment-timezone";

const COLOMBIA_TZ = "America/Bogota";

/**
 * Returns the current date and time in Colombia.
 */
export const nowInColombia = (): Date => {
  return moment().tz(COLOMBIA_TZ).toDate();
};

/**
 * Returns the start and end of a given date in Colombia TZ as UTC Dates for Prisma.
 * @param date - Date string (YYYY-MM-DD) or Date object
 */
export const getColombiaDayRange = (date: string | Date): { start: Date; end: Date } => {
  const m = moment.tz(date, COLOMBIA_TZ);
  return {
    start: m.clone().startOf("day").toDate(),
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
