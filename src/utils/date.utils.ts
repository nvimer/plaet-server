import moment from "moment-timezone";

const COLOMBIA_TZ = "America/Bogota";

/**
 * Standard Date Utility for Plaet API
 * Centralizes all timezone-aware operations for Colombia (UTC-5)
 */
export const dateUtils = {
  /**
   * Returns current timestamp in Colombia
   */
  now: (): Date => moment().tz(COLOMBIA_TZ).toDate(),

  /**
   * Returns the absolute start of today (00:00:00.000) in Colombia
   */
  today: (): Date => moment().tz(COLOMBIA_TZ).startOf("day").toDate(),

  /**
   * Normalizes any date to the start of its day in Colombia
   */
  startOfDay: (date: string | Date | number): Date => 
    moment.tz(date, COLOMBIA_TZ).startOf("day").toDate(),

  /**
   * Returns a range [start, end] for a specific day, used for Prisma filters
   */
  getDayRange: (date: string | Date | number) => {
    const start = moment.tz(date, COLOMBIA_TZ).startOf("day");
    return {
      start: start.toDate(),
      end: start.clone().endOf("day").toDate(),
    };
  },

  /**
   * Formats to YYYY-MM-DD specifically for DB keys or logs
   */
  toKey: (date: Date | string): string => 
    moment.tz(date, COLOMBIA_TZ).format("YYYY-MM-DD")
};
